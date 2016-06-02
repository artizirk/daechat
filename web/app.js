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
        })
        req.then(function(resp){
            if (resp.ok){
                app.showMain();
                resp.json().then(function(json){
                    app.showSnackbar({message:`You are now logged in with email ${json.email}`})
                })
            }
        })
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
        })
        req.then(function(resp){
            if(resp.ok) {
                app.showSnackbar({message:"You are now logged out"});
                app.showLogin();
            } else {
                app.showSnackbar({message:"Logout failed"});
            }
        })
    },

    doLogin: function() {
        // login using data from the login form
        var email = document.querySelector("#email");
        var password = document.querySelector("#password");
        if (email.value == "" || password.value == "") {
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
                app.showSnackbar({message:`Login Failed: ${resp.statusText}`})
                console.log(resp);
                throw false;
            }
        }).then(function(resp){
            console.log(resp);
            app.showSnackbar({message:`You are now logged in with email ${resp.email}`})
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
        var passwordAgain = document.querySelector("#password-again")
        if (email.value == "") {
            email.setAttribute("required", "required");
            email.parentElement.className +=" is-invalid";
            email.focus();
        } else if (password.value == "") {
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
            app.showSnackbar({message: "Passwords don't match!"})
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
                    app.showSnackbar({message:"Account created!"})
                } else {
                    resp.json().then(function(json){
                        console.log(json);
                        if (json.title == "NotUniqueError") {
                            app.showSnackbar({message: `Account with that email already exists`})
                        }else {
                            app.showSnackbar({message:`Account creation failed: "${json.title}" ${json.description}`});
                        }
                    })
                }
            })

    },

    showMain: function() {
        // show main app view
        document.querySelector("#login-view").style.display = "none";
        document.querySelector("#main-view").style.display = "";
        app.setTitle("Main");
    },

    setTitle: function(title) {
        // set the current title of app
        var els = document.querySelectorAll(".main-title");
        for (let el of els){
            el.textContent = `daechat - ${title}`;
        }
    },

    showSnackbar: function(data) {
        // show a notification
        var snackbarContainer = document.querySelector("#snackbar");
        snackbarContainer.MaterialSnackbar.showSnackbar(data);
    }
}

// main entrypoint
app.testLogin().then(function(resp){
    console.log(resp);
    if (!resp.ok) {
        // we are not logged in
        app.showLogin();
    }
})
