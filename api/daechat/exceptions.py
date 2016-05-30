from falcon.errors import *


class SessionNotFound(HTTPNotFound):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.title is None:
            self.title = 'No active session found'

        if self.description is None:
            self.description = 'Your session may not have been found on the database or you are just not logged in.'


class UserNotFound(HTTPNotFound):
    description = "This session doesn't belong to any user"
    title = 'UserNotFound'


class AuthenticationError(Exception):
    pass
