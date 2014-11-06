$(document).ready(function() {
	
	//////// LOGIN ////////

	// open login lightbox
	$("#loginOpenButton").click(
		function(evt) {
			$("#loginFormDiv").lightbox_me({
				centered: true,
				appearEffect: "fadeIn",
				closeClick: false,
				closeSelector: ".close",
				onLoad: function() {
					$("#loginForm").find("input:first").focus();
				}
			});
			evt.preventDefault();
		}
	);

	// login user
	$("#loginButton").click(
		function(evt) {
			// get email
			var email = $("#loginEmail").val();
			var password = $("#loginPassword").val();

			evt.preventDefault();

			// post login event
			$.post(
				"/login",
				{
					"email": email,
					"password": password
				},
				function(result) {
					if (result == "noUser") {
						evt.preventDefault();
						alert("No user with that email");
					}
					else if (result == "wrongPassword") {
						alert("Wrong password!");
					}
					else {
						// user logged in

						// close lightbox and reload page
						$("#loginFormDiv").trigger("close");
						window.location.reload();
					}

				}
			);
		}
	);



	/////// SIGN UP ////////

	var emptyFieldError = false;
	var passwordError = false;

	// open signup lightbox
	$("#signupOpenButton").click(
		function(evt) {
			$("#signupFormDiv").lightbox_me({
				centered: true,
				appearEffect: "fadeIn",
				closeClick: false,
				closeSelector: ".close",
				onLoad: function() {
					$("#signupForm").find("input:first").focus();
				}
			});
			evt.preventDefault();

			// reset form field errors upon close
			$("#signupPasswordEF").addClass("hidden");	
			$("#passwordConfirmEF").addClass("hidden");	
			$("#usernameEF").addClass("hidden");	
			$("#signupEmailEF").addClass("hidden");	

			emptyFieldError = false;
			passwordError = false;
			$("#signupErrorMessage").addClass("hidden");
		}
	);

	// signup user
	$("#signupButton").click(
		function(evt) {
			
			evt.preventDefault();

			emptyFieldError = false;
			var emptyFieldMessage = "* Please fill in required fields";

			passwordError = false;
			var passwordErrorMessage = "Passwords do not match";

			// GET PASSWORD
			var password = $("#signupPassword").val();
			if (password == "") {
				$("#signupPasswordEF").removeClass("hidden");
				emptyFieldError = true;
			}
			else if (!$("#signupPasswordEF").hasClass("hidden")) {
				$("#signupPasswordEF").addClass("hidden");
			}
			
			// GET CONFIRMED PASSWORD
			var passwordConfirm = $("#passwordConfirm").val();
			if (passwordConfirm == "") {
				$("#passwordConfirmEF").removeClass("hidden");
				emptyFieldError = true;
			}
			else if (!$("#passwordConfirmEF").hasClass("hidden")) {
				$("#passwordConfirmEF").addClass("hidden");
			}
			
			// GET USERNAME
			var username = $("#username").val();
			if (username == "") {
				$("#usernameEF").removeClass("hidden");
				emptyFieldError = true;
			}
			else if (!$("#usernameEF").hasClass("hidden")) {
				$("#usernameEF").addClass("hidden");
			}

			// GET EMAIL
			var email = $("#signupEmail").val();
			if (email == "") {
				$("#signupEmailEF").removeClass("hidden");
				emptyFieldError = true;
			}
			else if (!$("#signupEmailEF").hasClass("hidden")) {
				$("#signupEmailEF").addClass("hidden");
			}

			// do passwords match?
			if (!emptyFieldError && password != passwordConfirm) {
				if (!$("#signupPasswordEF").hasClass("hidden")) {
					$("#signupPasswordEF").addClass("hidden");
				}
				message = passwordErrorMessage;
				passwordError = true;
				$("#passwordConfirmEF").removeClass("hidden");
				$("#signupPasswordEF").removeClass("hidden");
			}

			// ERROR MESSAGE
			if (emptyFieldError) {
				$("#signupErrorMessage").removeClass("hidden");
				$("#signupErrorMessage").text(emptyFieldMessage);
				return;
			}
			else if (passwordError) {
				$("#signupErrorMessage").empty();
				$("#signupErrorMessage").removeClass("hidden");
				$("#signupErrorMessage").text(passwordErrorMessage);
				return;
			}
			else if (!$("#signupErrorMessage").hasClass("hidden")){
				$("#signupErrorMessage").addClass("hidden");
				$("#signupErrorMessage").empty();
			}

			
			// post event
			$.post(
				"/signup",
				{
					"username": username,
					"email": email,
					"password": password
				},
				function(result) {
					if (result == "userExists") {
						alert("user already exists. LOGIN");
					}
					else {
						// user signed up and logged in

						// close lightbox and reload page
						$("#signupFormDiv").trigger("close");
						window.location.reload();
					}
				}
			);
		}
	);



	//////// CLOSE LIGHTBOX ////////
	
	$(".lightBoxClose").click(
		function(evt) {

			$("#loginFormDiv").trigger("close");
			document.loginForm.reset();

			$("#signupFormDiv").trigger("close");
			document.signupForm.reset();
		}
	);


});