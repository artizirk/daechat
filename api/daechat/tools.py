
import json
import datetime
from functools import wraps

import falcon
from falcon import Request as FalconRequest
from falcon import Response as FalconResponse
from falcon.errors import HTTPBadRequest, HTTPMissingParam
from mongoengine import DoesNotExist
from bson.objectid import ObjectId

from .models import Session
from .exceptions import SessionNotFound


class BSONDumps(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)

dumps = BSONDumps(indent=4).encode


class JsonRequest(FalconRequest):

    __slots__ = set(FalconRequest.__slots__ + ("_json", "_session"))


    @property
    def json(self):
        if not hasattr(self, "_json"):
            if not self.client_accepts_json:
                raise falcon.HTTPUnsupportedMediaType(
                    'This API only supports the JSON formated data')
            try:
                self._json = json.loads(self.stream.read().decode('utf8'))
            except json.decoder.JSONDecodeError as err:
                raise HTTPBadRequest("JSONDecodeError", str(err))
        return self._json

    @property
    def session(self):
        if hasattr(self, '_session') and self._session:
            return self._session

        sid = self.cookies.get("SID")
        if sid:
            try:
                self._session = Session.objects.get(sid=sid)
            except DoesNotExist as err:
                self._session = None
        else:
            self._session = None
        return self._session
        


class JsonResponse(FalconResponse):

    __slots__ = set(FalconRequest.__slots__ + ("_json", "_session"))


    @property
    def json(self):
        return self._json

    @json.setter
    def json(self, value):
        self._json = value
        self.body = dumps(value)

    @property
    def session(self):
        return self._session

    @session.setter
    def session(self, value):
        self._session = value
        if value:
            self.set_cookie("SID", value.sid,
                            secure=False,
                            expires=datetime.datetime.fromtimestamp(2147483647))
        else:
            self.unset_cookie("SID")
            self.set_cookie('SID', '', secure=False)
            self._cookies['SID']["expires"] = -1


def is_logged_in(f):
    @wraps(f)
    def wrapper(self, req, resp, *args, **kwargs):
        if not req.session or not req.session.user:
            raise SessionNotFound
        return f(self, req, resp, *args, **kwargs)
    return wrapper


def require_args(args):
    def wrapper_gen(f):
        @wraps(f)
        def wrapper(self, req, resp, *largs, **kwargs):
            json = req.json
            missing_params = args - set(json.keys())
            if missing_params:
                raise HTTPMissingParam(missing_params.pop())
            return f(self, req, resp, *largs, **kwargs)
        return wrapper
    return wrapper_gen


def error_handler(ex, req, resp, params):
    if isinstance(ex, NotImplementedError):
        resp.status = falcon.HTTP_NOT_IMPLEMENTED
    else:
        raise HTTPBadRequest(type(ex).__name__, str(ex))
