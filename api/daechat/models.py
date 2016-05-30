import datetime
from uuid import uuid4
from mongoengine import *


__all__ = [
            'User',
            'Session',
            'Room',
            'Message'
        ]


def gen_sid():
    """Generate a random session id, in this case a random 128bit uuid"""
    return uuid4().hex


class User(Document):
    """A generic user who can login"""

    full_name = StringField()
    nick = StringField()
    email = EmailField(unique=True)
    auth = StringField()

    registration_time = DateTimeField(default=datetime.datetime.now)


class Session(Document):
    """Session object represents a logged in user"""

    user = ReferenceField(User)
    sid = StringField(default=gen_sid, primary_key=True)
    ctime = DateTimeField(default=datetime.datetime.now)


class Room(Document):
    """Chatroom object
    admins list holds users who can change this chat name and delete the chat
    users list holds users who can send and recive messages in this room"""

    name = StringField(unique=True)
    users = ListField(ReferenceField(User))
    admins = ListField(ReferenceField(User))


class Message(Document):
    """A message that is sent to a room"""

    message = StringField()
    author = ReferenceField(User)
    time = DateTimeField(default=datetime.datetime.now)
    room = ReferenceField(Room)
