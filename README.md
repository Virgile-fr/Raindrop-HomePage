# Raindrop-HomePage
<img src="./preview.jpeg">
Raindrop Homepage is just a minimalist interface to display your Raindrop bookmarks marked as favorites. This application is not intended to replicate the interface of Raindrop.io.

I made this app/page because for me, it's the best way to have simple quick and easy access to all my favorites on all my browsers and devices without having to worry about syncing all my browsers. Especially because safari can only be synced with others browsers on Windows with the iCloud plugin, wish is a pain in my ass... 

<h3>to use it, this is fairly simple.</h3>

<ol>
<li> Download the content of this app and host is wherever you want</li>

<li> make sure you are log-in in your Raindrop Account</li>

<li> go to this link https://app.raindrop.io/settings/integrations </li>

<li> click the "+ Create a new app" button  </li>

<li> Name your app as you wish, like "My Username Homepage" and accept the raindrop API Terms & Guidelines </li>

<li> click on the app name you just created  </li>

<li> click on "Create test token" and copy it  </li>

<li>  paste it on the token.js file and save it </li>

<li> open the index.html and set this as your homepage / new tab in your browser, and it's done. 🙂</li>
</ol>

<i><b>NB: -for safari in iOS, you cannot set a homepage, so simply  add the webpage icon on the home screen and use it instead of safari.</b>

-the switch on the top right let you change from favicon view to cover view.

-with the favicon view icon are fetching with the Google icons API, which I think is the best available for free (check the favicons.js to explore others choices.)
Sadly even with the Google API some icons are in low resolution, another solution will be to fetch apple-touch-icons in the head of each bookmark, but I couldn't do it...
On the favicon view, each card background is a backdrop-filter with some effect to it.

-if you are not a fan of the icon view, you can switch to the cover view, it will use the cover automatically generated by raindrop.io
note that you can customize it in the raindrop app itself.</i>
