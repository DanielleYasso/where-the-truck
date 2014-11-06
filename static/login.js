$(document).ready(function() {
	
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
		}
	);

	// close lightbox
	$(".lightBoxClose").click(
		function(evt) {
			$("#loginFormDiv").trigger("close");
			$("#signupFormDiv").trigger("close");
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

	// signup user
	$("#signupButton").click(
		function(evt) {
			
			evt.preventDefault();

			var password = $("#signupPassword").val();
			var passwordConfirm = $("#passwordConfirm").val();

			// do passwords match?
			if (password != passwordConfirm) {
				// error
				alert("Passwords don't match");
				return;
			}
			
			var username = $("#username").val();
			var email = $("signupEmail").val();

			// post event
			$.post(
				"/signup",
				{
					"username": username,
					"email": email,
					"password": password
				}
			);
		}
	);



});