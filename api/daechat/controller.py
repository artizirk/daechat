from mongoengine.errors import ValidationError, FieldDoesNotExist, DoesNotExist, NotUniqueError
from mongoengine import Q

from falcon import HTTPNotFound, HTTPMissingParam, HTTPBadRequest, HTTPUnauthorized, HTTP_CREATED, HTTP_BAD_REQUEST, HTTP_CONFLICT
from passlib.apps import custom_app_context as password_ctx

import requests

from .models import Session, User, Room, Message
from .tools import is_logged_in, require_args
from .exceptions import *

__all__ = ['SessionResource']


class UserResource():
    """Funtions for creating, changing and deleting a user"""

    @require_args({'email', 'password'})
    def on_post(self, req, resp):
        """"Create a new User on the server"""

        json = req.json
        user = User()
        user.email = json["email"]
        user.auth = password_ctx.encrypt(json["password"])
        user.full_name = json.get("full_name")
        user.nick = json.get("nick")
        try:
            user.save()
            resp.status = HTTP_CREATED
        except ValidationError as err:
            raise HTTPBadRequest("ValidationError", str(err))
        except NotUniqueError as err:
            raise HTTPConflict("NotUniqueError", str(err))

    @is_logged_in
    def on_patch(self, req, resp, uid=None):
        """Update user data on the server"""

        user = req.session.user
        json = req.json
        if "nick" in json:
            user.nick = req.json["nick"]
        if "full_name" in json:
            user.full_name = req.json["full_name"]
        user.save()


    @is_logged_in
    def on_get(self, req, resp, uid=None):
        """"Get a list of users or a single user on the server"""

        session = req.session
        if not uid:
            user = session.user.to_mongo()
            del user["auth"]
            resp.json = user
        else:
            raise NotImplementedError

    @is_logged_in
    def on_delete(self, req, resp, uid=None):
        """"Delete a user, if no uid provided delete currently logged in user"""

        if not uid:
            session = req.session
            session.delete()
            resp.session = None

            if hasattr(session, 'user'):
                Session.objects(user=session.user).delete()
                session.user.delete()
        else:
            raise NotImplementedError


class SessionResource():
    """User login handling"""

    @is_logged_in
    def on_get(self, req, resp):
        """Get currently active session"""

        user = req.session.user
        uid = str(user.id)
        email = str(user.email)
        resp.json = {'sid': req.session.sid,
                     'uid': uid,
                     'email': email}

    def on_post(self, req, resp):
        """Create a new session based on provided login information"""

        json = req.json

        #FIXME: implement timing-invariance to fix timing attacks
        try:
            user = User.objects.get(email=json.get("email"))
            if password_ctx.verify(json.get("password"), user.auth):
                session = Session()
                session.user = user
                session.save()
                resp.session = session

                resp.json = {'sid': session.sid,
                             'uid':str(user.id),
                             'email': user.email}
            else:
                raise AuthenticationError()
        except (DoesNotExist, AuthenticationError) as err:
            raise HTTPUnauthorized("AuthenticationError", "No such user or wrong password", "")

    @is_logged_in
    def on_delete(self, req, resp):
        """End current session"""
        resp.session = None
        req.session.delete()


class RoomResource():

    def on_get(self, req, resp, room_id=None):
        """Get a room or rooms wiht list of users in the room"""

        if room_id:
            room = Room.objects.get(id=room_id)
            resp.json = room.to_mongo()
        else:

            rooms = []
            q = req.params.get("q", None)
            if q:
                room_objs = Room.objects(__raw__={"name":{"$regex":q, "$options":"ix"}})
            elif req.session:
                room_objs = Room.objects(Q(users__contains=req.session.user) | Q(admins__contains=req.session.user))
            else:
                room_objs = Room.objects()

            for room in room_objs:
                rooms.append(room.to_mongo())

            resp.json = rooms


    @require_args({"name"})
    @is_logged_in
    def on_post(self, req, resp, room_id=None):
        """Create a new room"""

        room = Room(name=req.json["name"])
        room.admins.append(req.session.user)
        room.save()

        resp.status = HTTP_CREATED
        resp.json = room.to_mongo()

    @is_logged_in
    def on_patch(self, req, resp, room_id):
        room = Room.objects.get(id=room_id)
        if "name" in req.json:
            room.name = req.json["name"]
            room.save()
            resp.json = room.to_mongo()
        elif "join" in req.json:
            if req.json["join"]:
                if req.session.user not in room.users or req.session.user not in room.admins:
                    room.users.append(req.session.user)
                    room.save()
                    resp.json = room.to_mongo()
                else:
                    resp.status = HTTP_CONFLICT
        else:
            resp.status = HTTP_BAD_REQUEST



class MessageResource():

    def on_get(self, req, resp, room_id, message_id=None):
        """Get a single or list of messages in a room"""
        if message_id:
            message = Message.objects.get(id=message_id)
            msg = message.to_mongo()
            msg["author"] = message.author.email
            resp.json = Message.objects.get(id=message_id).to_mongo()
        else:
            messages = []
            for message in Message.objects(room=room_id).order_by('-time')[:10]:
                msg = message.to_mongo()
                msg["author"] = message.author.email
                messages.append(msg)
            resp.json = messages[::-1]

    @require_args({"message"})
    @is_logged_in
    def on_post(self, req, resp, room_id, message_id=None):
        """Post a message to a room"""

        room = Room.objects.get(id=room_id)

        message = Message(message=req.json["message"])
        message.room = room
        message.author = req.session.user
        message.save()

        resp.status = HTTP_CREATED
        msg = message.to_mongo()
        msg["author"] = message.author.email
        resp.json = msg

        requests.post("http://localhost/api/v1/pub/room/"+room_id+"/message", data=resp.body)
