// š§ Enter Your Raindrop Token here š //
let raindropToken = "XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX";

let token;

if (raindropToken == "XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX") {
  if (
    localStorage.token == "null" ||
    localStorage.token == "undefined" ||
    localStorage.token == undefined
  ) {
    const localToken = prompt(
      "š  Welcome to Raindrop HomePage\n\nplease enter your test-token\nif you dont know how to do it, please visit the url below\n\nā¹ļø https://github.com/Virgile-fr/Raindrop-HomePage"
    );
    localStorage.setItem("token", localToken);
    token = localStorage.token;
  } else {
    token = localStorage.token;
  }
} else {
  token = raindropToken;
}
