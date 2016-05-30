# DAECHAT backend API

This is DAECHAT backend API written using Python
with Falcon and MongoDB

# Running it

First make sure that you have a Python 3 and uwsgi installed using your system package manager.

As this project also uses MongoDB then also make sure that it is also installed and running.

```
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uwsgi --ini uwsgi.ini:dev
```
