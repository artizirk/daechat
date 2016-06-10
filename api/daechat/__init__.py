import json

import falcon
import mongoengine
from mongoengine.errors import ValidationError, FieldDoesNotExist

from .tools import JsonRequest, JsonResponse, error_handler

from .controller import SessionResource, UserResource, RoomResource, MessageResource


class About():
    def on_get(self, req, resp):
        about = {"about": {
                        "name":"DAECHAT API",
                        "version":"1",
                        "url":"https://github.com/artizirk/daechat"
                    }
                }
        resp.body = json.dumps(about, indent=4)


mongoengine.connect('daechat', connect=False)

app = application = falcon.API(request_type=JsonRequest, response_type=JsonResponse)
#app.add_error_handler(ValidationError, error_handler)
#app.add_error_handler(FieldDoesNotExist, error_handler)
#app.add_error_handler(ValueError, error_handler)
#app.add_error_handler(NotImplementedError, error_handler)

app.add_route("/", About())
app.add_route("/session", SessionResource())

user_resource = UserResource()
app.add_route("/user", user_resource)
app.add_route("/user/{uid}", user_resource)

room_resource = RoomResource()
app.add_route("/room", room_resource)
app.add_route("/room/{room_id}", room_resource)

message_resource = MessageResource()
app.add_route("/room/{room_id}/message", message_resource)
