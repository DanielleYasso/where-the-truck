$(document).ready(function() {
	
	///////////////////////

	//////// LOGIN ////////

	///////////////////////

	var loginEmptyFieldError = false;

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

			// reset field errors
			$("#emailEF").addClass("hidden");
			$("#passwordEF").addClass("hidden");

			loginEmptyFieldError = false;
			$("#loginErrorMessage").addClass("hidden");


		}
	);

	// login user
	$("#loginButton").click(
		function(evt) {

			evt.preventDefault();

			loginEmptyFieldError = false;
			var emptyFieldMessage = "* Please fill in required fields";
			
			// GET EMAIL
			var email = $("#loginEmail").val();
			if (email == "") {
				$("#emailEF").removeClass("hidden");
				loginEmptyFieldError = true;
			}
			else if (!$("#emailEF").hasClass("hidden")) {
				$("#emailEF").addClass("hidden");
			}

			// GET PASSWORD
			var password = $("#loginPassword").val();
			if (password == "") {
				$("#passwordEF").removeClass("hidden");
				loginEmptyFieldError = true;
			}
			else if (!$("#passwordEF").hasClass("hidden")) {
				$("#passwordEF").addClass("hidden");
			}

			// ERROR MESSAGE
			if (loginEmptyFieldError) {
				$("#loginErrorMessage").removeClass("hidden");
				$("#loginErrorMessage").text(emptyFieldMessage);
				return;
			}
			else if (!$("#loginErrorMessage").hasClass("hidden")){
				$("#loginErrorMessage").addClass("hidden");
				$("#loginErrorMessage").empty();
			}

			var rememberMe = false;
			// GET REMEMBER ME CHECKBOX
			if ($("input[name='rememberMeLogin']:checked")) {
				rememberMe = true;
			}


			// post login event
			$.post(
				"/login",
				{
					"email": email,
					"password": password,
					"rememberMe": rememberMe
				},
				function(result) {
					if (result == "incorrect") {
						$("#emailEF").removeClass("hidden");
						$("#passwordEF").removeClass("hidden");
						$("#loginErrorMessage").removeClass("hidden");
						$("#loginErrorMessage").text("Invalid email or password.");
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


	////////////////////////

	/////// SIGN UP ////////

	////////////////////////

	var signmptyFieldError = false;
	var signupPasswordError = false;

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

			signupmptyFieldError = false;
			signupPasswordError = false;
			$("#signupErrorMessage").addClass("hidden");
		}
	);

	// signup user
	$("#signupButton").click(
		function(evt) {
			
			evt.preventDefault();

			signupEmptyFieldError = false;
			var emptyFieldMessage = "* Please fill in required fields";

			signupPasswordError = false;
			var signupPasswordErrorMessage = "Passwords do not match";

			// GET PASSWORD
			var password = $("#signupPassword").val();
			if (password == "") {
				$("#signupPasswordEF").removeClass("hidden");
				signupEmptyFieldError = true;
			}
			else if (!$("#signupPasswordEF").hasClass("hidden")) {
				$("#signupPasswordEF").addClass("hidden");
			}
			
			// GET CONFIRMED PASSWORD
			var passwordConfirm = $("#passwordConfirm").val();
			if (passwordConfirm == "") {
				$("#passwordConfirmEF").removeClass("hidden");
				signupEmptyFieldError = true;
			}
			else if (!$("#passwordConfirmEF").hasClass("hidden")) {
				$("#passwordConfirmEF").addClass("hidden");
			}
			
			// GET USERNAME
			var username = $("#username").val();
			if (username == "") {
				$("#usernameEF").removeClass("hidden");
				signupEmptyFieldError = true;
			}
			else if (!$("#usernameEF").hasClass("hidden")) {
				$("#usernameEF").addClass("hidden");
			}

			// GET EMAIL
			var email = $("#signupEmail").val();
			if (email == "") {
				$("#signupEmailEF").removeClass("hidden");
				signupEmptyFieldError = true;
			}
			else if (!$("#signupEmailEF").hasClass("hidden")) {
				$("#signupEmailEF").addClass("hidden");
			}

			// CHECK FOR MATCHING PASSWORDS
			if (!signupEmptyFieldError && password != passwordConfirm) {
				if (!$("#signupPasswordEF").hasClass("hidden")) {
					$("#signupPasswordEF").addClass("hidden");
				}
				message = signupPasswordErrorMessage;
				signupPasswordError = true;
				$("#passwordConfirmEF").removeClass("hidden");
				$("#signupPasswordEF").removeClass("hidden");
			}

			// ERROR MESSAGE
			if (signupEmptyFieldError) {
				$("#signupErrorMessage").removeClass("hidden");
				$("#signupErrorMessage").text(emptyFieldMessage);
				return;
			}
			else if (signupPasswordError) {
				$("#signupErrorMessage").empty();
				$("#signupErrorMessage").removeClass("hidden");
				$("#signupErrorMessage").text(signupPasswordErrorMessage);
				return;
			}
			else if (!$("#signupErrorMessage").hasClass("hidden")){
				$("#signupErrorMessage").addClass("hidden");
				$("#signupErrorMessage").empty();
			}

			var rememberMe = false;
			// GET REMEMBER ME CHECKBOX
			if ($("input[name='rememberMeSignup']:checked")) {
				rememberMe = true;
			}

			
			// post event
			$.post(
				"/signup",
				{
					"username": username,
					"email": email,
					"password": password,
					"rememberMe": rememberMe
				},
				function(result) {
					if (result == "userExists") {
						$("#signupEmailEF").removeClass("hidden");
						$("#signupErrorMessage").removeClass("hidden");
						$("#signupErrorMessage").html("User email exists.<br>Login or use a different email.");
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


	////////////////////////////////

	//////// CLOSE LIGHTBOX ////////

	////////////////////////////////
	
	$(".lightBoxClose").click(
		function(evt) {

			$("#loginFormDiv").trigger("close");
			document.loginForm.reset();

			$("#signupFormDiv").trigger("close");
			document.signupForm.reset();
		}
	);


	///////// FORGOT PASSWORD ////////




	


});