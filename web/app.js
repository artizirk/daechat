"use strict";

var app = {
    loginFormView: "login",
    showLogin: function() {
        document.querySelector("#login-view").style.display = "";
        document.querySelector("#main-view").style.display = "none";
        document.querySelector("#password-again-container").style.display = "none";
        document.querySelector("#login-view h2").textContent = "Login";
        app.setTitle("Login");
        app.loginFormView = "login";
        document.querySelector("#email").focus();
    },

    doLoginForm: function(ev) {
        // handle login form enter key press
        if (ev.keyCode == 13) {
            if (app.loginFormView === "login") {
                app.doLogin();
            } else if (app.loginFormView === "register") {
                app.doRegister();
            }
        }
    },

    testLogin: function() {
        // are we logged in
        var req = fetch("/api/v1/session", {
            credentials:"same-origin",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        });
        req.then(function(resp){
            if (resp.ok){
                app.showMain();
                resp.json().then(function(json){
                    app.showSnackbar({message:`You are now logged in with email ${json.email}`});
                });
            }
        });
        return req;
    },

    doLogout: function() {
        // kill the logged in session
        var req = fetch("/api/v1/session", {
            credentials:"same-origin",
            method:"DELETE",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        req.then(function(resp){
            if(resp.ok) {
                app.showSnackbar({message:"You are now logged out"});
                app.showLogin();
            } else {
                app.showSnackbar({message:"Logout failed"});
            }
        });
    },

    doLogin: function() {
        // login using data from the login form
        var email = document.querySelector("#email");
        var password = document.querySelector("#password");
        if (email.value === "" || password.value === "") {
            email.setAttribute("required", "required");
            email.parentElement.className +=" is-invalid";
            password.setAttribute("required", "required");
            password.parentElement.className +=" is-invalid";
            componentHandler.upgradeAllRegistered();
            return;
        }
        fetch('/api/v1/session', {
          method: 'POST',
          credentials:"same-origin",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.value,
            password: password.value,
          })
        }).then(function(resp) {
            if (resp.ok) {
                return resp.json();
            } else {
                app.showSnackbar({message:`Login Failed: ${resp.statusText}`});
                console.log(resp);
                throw false;
            }
        }).then(function(resp){
            console.log(resp);
            app.showSnackbar({message:`You are now logged in with email ${resp.email}`});
            app.showMain();
        }).catch(function(err){

        })
    },

    showRegister: function() {
        // convert login form to registration form
        document.querySelector("#login-view").style.display = "";
        document.querySelector("#password-again-container").style.display = "";
        document.querySelector("#main-view").style.display = "none";
        document.querySelector("#login-view h2").textContent = "Register";
        document.querySelector("#register-button").onclick = app.doRegister;
        app.setTitle("Register");
        app.loginFormView = "register";
        var email = document.querySelector("#email");
        var password = document.querySelector("#password");
        var passwordAgain = document.querySelector("#password-again");
        if (email.value === "") {
            email.setAttribute("required", "required");
            email.parentElement.className +=" is-invalid";
            email.focus();
        } else if (password.value === "") {
            password.setAttribute("required", "required");
            password.parentElement.className +=" is-invalid";
            password.focus();
        } else {
            passwordAgain.setAttribute("required", "required");
            passwordAgain.parentElement.className += " is-invalid";
            passwordAgain.focus();
        }
        componentHandler.upgradeAllRegistered();
    },

    doRegister: function() {
        // register a new user using data from login-form
        var email = document.querySelector("#email");
        var password = document.querySelector("#password");
        var passwordAgain = document.querySelector("#password-again");
        if (email.value == "" || password.value == "" || passwordAgain.value == "") {
            email.setAttribute("required", "required");
            email.parentElement.className +=" is-invalid";
            password.setAttribute("required", "required");
            password.parentElement.className +=" is-invalid";
            passwordAgain.setAttribute("required", "required");
            passwordAgain.parentElement.className += " is-invalid";
            componentHandler.upgradeAllRegistered();
            return;
        }

        if (password.value != passwordAgain.value) {
            app.showSnackbar({message: "Passwords don't match!"});
            password.parentElement.className +=" is-invalid";
            passwordAgain.parentElement.className += " is-invalid";
            return;
        }

        fetch("/api/v1/user", {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email.value,
                password: password.value
            })}).then(function(resp){
                if (resp.ok) {
                    app.doLogin();
                    app.showSnackbar({message:"Account created!"});
                } else {
                    resp.json().then(function(json){
                        console.log(json);
                        if (json.title == "NotUniqueError") {
                            app.showSnackbar({message: `Account with that email already exists`});
                        }else {
                            app.showSnackbar({message:`Account creation failed: "${json.title}" ${json.description}`});
                        }
                    });
                }
            });
    },

    showMain: function() {
        // show main app view
        document.querySelector("#login-view").style.display = "none";
        document.querySelector("#main-view").style.display = "";
        app.setTitle("Main");
        app.loadRooms();
    },

    setTitle: function(title) {
        // set the current title of app
        var els = document.querySelectorAll(".main-title");
        for (let el of els) {
            el.textContent = `daechat - ${title}`;
        }
    },

    showSnackbar: function(data) {
        // show a notification
        var snackbarContainer = document.querySelector("#snackbar");
        snackbarContainer.MaterialSnackbar.showSnackbar(data);
    },

    loadRooms: function(selectRoomId) {
        fetch("/api/v1/room", {
            credentials:"same-origin",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }).then(resp => {
            if (resp.ok) {
                return resp.json();
            } else {
                console.log(resp);
            }
        }).then(rooms => {
            let roomWasSelected = false;
            var roomListViewUl = document.querySelector("#room-list-view > ul");
            while (roomListViewUl.firstChild) {
                roomListViewUl.removeChild(roomListViewUl.firstChild);
            }
            rooms.forEach((room, i) => {
                console.log(room);
                let li = document.createElement("li");
                li.className = "mdl-list__item";
                if (selectRoomId) {
                    if (room._id === selectRoomId) {
                        li.className += " selected";
                        app.currentChatRoom = room._id;
                        app.loadChat(room._id);
                    } 
                } else if (i == 0) {
                    li.className += " selected";
                    app.currentChatRoom = room._id;
                    app.loadChat(room._id);
                }

                li.appendChild(document.createTextNode(room.name));
                li.onclick = function() {
                    for (let el of roomListViewUl.childNodes){
                        el.classList.remove("selected");
                    }
                    this.classList.add("selected");
                    app.currentChatRoom = room._id;
                    app.loadChat(room._id);
                    document.querySelector("#chat-input").focus();
                }
                roomListViewUl.appendChild(li);
            });
        });
    },

    loadChat: function(roomId) {
        fetch(`/api/v1/room/${roomId}/message`, {
            credentials:"same-origin",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }).then(resp => {
            if (resp.ok) {
                return resp.json();
            } else {
                console.log(resp);
            }
        }).then(chatLines => {
            var chatViewUl = document.querySelector("#chat-view > ul");
            while (chatViewUl.firstChild) {
                chatViewUl.removeChild(chatViewUl.firstChild);
            }
            chatLines.forEach((line, i) => {
                // TODO: this should be a function
                let li = document.createElement("li");
                li.className = "mdl-list__item mdl-list__item--two-line";
                let container = document.createElement("span");
                container.className = "mdl-list__item-primary-content";
                let msg = document.createElement("span");
                msg.appendChild(document.createTextNode(line.message));
                container.appendChild(msg);
                let author = document.createElement("span");
                author.appendChild(document.createTextNode(line.author));
                author.className = "mdl-list__item-sub-title";
                container.appendChild(author);
                li.appendChild(container);
                chatViewUl.appendChild(li);
            });
            if (chatViewUl.lastChild) {
                chatViewUl.lastChild.scrollIntoView();
            }
            if (app.messageEventSource){
                app.messageEventSource.close();
            }
            app.messageEventSource = new EventSource(`/api/v1/sub/room/${roomId}/message`, { withCredentials: true });
            app.messageEventSource.onmessage = message => {
                // TODO: this should be a function
                let line = JSON.parse(message.data);
                let li = document.createElement("li");
                li.className = "mdl-list__item mdl-list__item--two-line";
                let container = document.createElement("span");
                container.className = "mdl-list__item-primary-content";
                let msg = document.createElement("span");
                msg.appendChild(document.createTextNode(line.message));
                container.appendChild(msg);
                let author = document.createElement("span");
                author.appendChild(document.createTextNode(line.author));
                author.className = "mdl-list__item-sub-title";
                container.appendChild(author);
                li.appendChild(container);
                chatViewUl.appendChild(li);
                chatViewUl.lastChild.scrollIntoView();
            }
        });
    },

    doChatInput: function(ev) {
        // handle chat input enter key press
        if (ev.keyCode == 13) {
            app.postMessage();
        }
    },

    postMessage: function() {
        var chatInput = document.querySelector("#chat-input");
        if (chatInput.value === "") {
            return;
        }
        fetch(`/api/v1/room/${app.currentChatRoom}/message`, {
            method: "POST",
            credentials:"same-origin",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body:JSON.stringify({
                message: chatInput.value
            })
        }).then(resp => {
            if (resp.ok) {
                chatInput.value = "";
                //app.loadChat(app.currentChatRoom);
                return resp.json();
            } else {
                console.log(resp);
            }
        })
    },

    doRoomSearch: function(ev) {
        //console.log(ev.keyCode);
        if (ev.keyCode == 27) { // on ESC
            ev.target.value = "";
            app.loadRooms();
            return;
        } else if (ev.keyCode == 13) {
            app.createRoom(ev.target.value);
            ev.target.value = "";
        }
        var search = ev.target.value;
        if (search !== "") {
            fetch(`/api/v1/room?q=${search}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            }).then(resp => {
                if (resp.ok) {
                    return resp.json();
                }
            }).then(rooms => {
                var roomListViewUl = document.querySelector("#room-list-view > ul");
                while (roomListViewUl.firstChild) {
                    roomListViewUl.removeChild(roomListViewUl.firstChild);
                }
                rooms.forEach((room, i) => {
                    console.log(room);
                    let li = document.createElement("li");
                    li.className = "mdl-list__item";
                    li.appendChild(document.createTextNode(room.name))
                    li.onclick = function() {
                        for (let el of roomListViewUl.childNodes){
                            el.classList.remove("selected");
                        }
                        this.classList.add("selected");
                        fetch(`/api/v1/room/${room._id}`, {
                            method: "PATCH",
                            credentials:"same-origin",
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                join:true,
                            })

                        }).then(resp => {
                            if (resp.ok) {
                                ev.target.value = "";
                                ev.target.parentElement.classList.remove("is-dirty");
                                document.querySelector("#chat-input").focus();
                                app.currentChatRoom = room._id;
                                app.loadChat(room._id);
                                app.loadRooms(room._id);
                            } else {
                                console.log(resp);
                            }
                        }).then(room => {
                            app.snackbarContainer({message:`Joined room ${room.name}`})
                        })
                        
                    }
                    roomListViewUl.appendChild(li);
                })
                console.log(rooms);
            })
        } else {
            app.loadRooms();
        }
    },

    createRoom: function(name) {
        fetch("/api/v1/room", {
            method:"POST",
            credentials:"same-origin",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name:name
            })
        }).then(resp => {
            if (resp.ok) {
                return resp.json();
            }
        }).then(json => {
            app.showSnackbar({message: `Room ${json.name} created`});
            app.currentChatRoom = json._id;
            app.loadChat(json._id);
            app.loadRooms(json._id);
            document.querySelector("#chat-input").focus();
        });
    }
}

// main entrypoint
document.addEventListener('DOMContentLoaded', function() {
    app.testLogin().then(function(resp){
        console.log(resp);
        if (!resp.ok) {
            // we are not logged in
            app.showLogin();
        }
    })
}, false);
