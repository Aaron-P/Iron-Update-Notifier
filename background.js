// Settings ////////////////////////////////////////////////////////////////////
var updateInterval    = 86400;
var versionUrl        = "https://www.srware.net/en/software_srware_iron_download.php";
var versionRegex      = /Version: <strong>([0-9.]+)<\/strong>/;
var versionRegexGroup = 1;
var updateRecord      = "lastUpdateTime";


//var updateMaxErrors = 10;// How to record errors?
//var updateIdleTime  = 60;
////////////////////////////////////////////////////////////////////////////////
// TODO: Refactor code to be more readable.
// TODO: Find a better fallback notification method than a confirm dialog. (popup requires tabs permissions, would rather avoid that.)
// TODO: Add support for Linux and Apple version. (http://iron-start.com/updates.php, language detection?)
// TODO: Add periodic attempts after start. (In case the browser is open for long periods.)
// TODO: Add notification duration?
// TODO: Add notification idle time check when chrome.idle api is fixed. (https://code.google.com/p/chromium/issues/detail?id=70381)
// TODO: Renotify after a certain interval?  Do we want to store the fact that an update exists?
// Should we display version numbers?
// Is there a way to detect https errors and fallback to http? Do we want to do that at all?

(function()
{// Anonymous function wrapper so we can stop execution by returning.
	if (updateInterval < 86400)
		updateInterval = 86400;// Minimum of one day?

	var currentVersion = getVersion();
	if (currentVersion === null)
		return;// Couldn't find Iron's version number.

	var currentTime  = Math.floor(new Date().getTime() / 1000);
	var previousTime = localStorage.getItem(updateRecord);
	if (previousTime === null)
	{
		previousTime = 0;
		localStorage.setItem(updateRecord, currentTime);
	}
	if (currentTime - updateInterval < previousTime)
		return;// Too soon since last update check.

	var notificationImage   = "images/icon32.png";
	var notificationTitle   = chrome.i18n.getMessage("notificationTitle");
	var notificationMessage = chrome.i18n.getMessage("notificationMessage");
	var confirmationMessage = chrome.i18n.getMessage("confirmationMessage");
	var downloadUrl         = chrome.i18n.getMessage("downloadUrl");

	var httpRequest = new XMLHttpRequest();
	httpRequest.onreadystatechange = function()
	{
		if (httpRequest.readyState !== 4)
			return;// Wrong request state.
		if (httpRequest.status !== 200)
			return;// TODO: Log this as an error;

		var latestVersion = httpRequest.responseText.match(versionRegex);
		if (latestVersion === null)
			return;// Didn't find new version number in response. TODO: Log this as an error.

		// TODO: Check successful, clear error count.
		localStorage.setItem(updateRecord, currentTime);
		if (version_compare(latestVersion[versionRegexGroup], currentVersion, "<="))
			return;// New version is the same or older than current version.

		if (window.webkitNotifications)
		{
			var notification = window.webkitNotifications.createNotification(notificationImage, notificationTitle, notificationMessage);
			notification.onclick = function()
			{
				chrome.tabs.create({url: downloadUrl, active: true});
				this.cancel();
			};
			notification.show();
		}
		else if (confirm(confirmationMessage))
			chrome.tabs.create({url: downloadUrl, active: true});
	}
	httpRequest.open("GET", versionUrl, true);
	httpRequest.send();
})();
//localStorage.removeItem(updateRecord);

function getOS()
{
	if (/Windows/i.test(navigator.appVersion))
		return "Windows";
	if (/X11|Linux/i.test(navigator.appVersion))// X11 may or may not be linux, but for our purposes we will assume it is.
		return "Linux";
	if (/Macintosh/i.test(navigator.appVersion))
		return "Mac";
	return null;
}

function getVersion()
{
//	var ironVersion = window.navigator.appVersion.match(/Iron\/([0-9.]+) /);// Give's wrong verison number.
	var ironVersion = window.navigator.appVersion.match(/Chrome\/([0-9.]+) /);
	if (ironVersion === null)
		return null;
	return ironVersion[1];
}

/*
Copyright (C) 2008 Kevin van Zonneveld

Portions copyright Philippe Jausions, Aidan Lister, Kankrelune, Brett Zamir,
Scott Baker, Theriault

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL KEVIN VAN ZONNEVELD BE LIABLE FOR ANY CLAIM, DAMAGES
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/
function version_compare (v1, v2, operator) {
	// http://kevin.vanzonneveld.net
	// +      original by: Philippe Jausions (http://pear.php.net/user/jausions)
	// +      original by: Aidan Lister (http://aidanlister.com/)
	// + reimplemented by: Kankrelune (http://www.webfaktory.info/)
	// +      improved by: Brett Zamir (http://brett-zamir.me)
	// +      improved by: Scott Baker
	// +      improved by: Theriault
	// *        example 1: version_compare('8.2.5rc', '8.2.5a');
	// *        returns 1: 1
	// *        example 2: version_compare('8.2.50', '8.2.52', '<');
	// *        returns 2: true
	// *        example 3: version_compare('5.3.0-dev', '5.3.0');
	// *        returns 3: -1
	// *        example 4: version_compare('4.1.0.52','4.01.0.51');
	// *        returns 4: 1
	// BEGIN REDUNDANT
	this.php_js = this.php_js || {};
	this.php_js.ENV = this.php_js.ENV || {};
	// END REDUNDANT
	// Important: compare must be initialized at 0.
	var i = 0,
	x = 0,
	compare = 0,
	// vm maps textual PHP versions to negatives so they're less than 0.
	// PHP currently defines these as CASE-SENSITIVE. It is important to
	// leave these as negatives so that they can come before numerical versions
	// and as if no letters were there to begin with.
	// (1alpha is < 1 and < 1.1 but > 1dev1)
	// If a non-numerical value can't be mapped to this table, it receives
	// -7 as its value.
	vm = {
		'dev': -6,
		'alpha': -5,
		'a': -5,
		'beta': -4,
		'b': -4,
		'RC': -3,
		'rc': -3,
		'#': -2,
		'p': -1,
		'pl': -1
	},
	// This function will be called to prepare each version argument.
	// It replaces every _, -, and + with a dot.
	// It surrounds any nonsequence of numbers/dots with dots.
	// It replaces sequences of dots with a single dot.
	//    version_compare('4..0', '4.0') == 0
	// Important: A string of 0 length needs to be converted into a value
	// even less than an unexisting value in vm (-7), hence [-8].
	// It's also important to not strip spaces because of this.
	//   version_compare('', ' ') == 1
	prepVersion = function (v) {
		v = ('' + v).replace(/[_\-+]/g, '.');
		v = v.replace(/([^.\d]+)/g, '.$1.').replace(/\.{2,}/g, '.');
		return (!v.length ? [-8] : v.split('.'));
	},
	// This converts a version component to a number.
	// Empty component becomes 0.
	// Non-numerical component becomes a negative number.
	// Numerical component becomes itself as an integer.
	numVersion = function (v) {
		return !v ? 0 : (isNaN(v) ? vm[v] || -7 : parseInt(v, 10));
	};
	v1 = prepVersion(v1);
	v2 = prepVersion(v2);
	x = Math.max(v1.length, v2.length);
	for (i = 0; i < x; i++) {
		if (v1[i] == v2[i]) {
			continue;
		}
		v1[i] = numVersion(v1[i]);
		v2[i] = numVersion(v2[i]);
		if (v1[i] < v2[i]) {
			compare = -1;
			break;
		} else if (v1[i] > v2[i]) {
			compare = 1;
			break;
		}
	}
	if (!operator) {
		return compare;
	}

	// Important: operator is CASE-SENSITIVE.
	// "No operator" seems to be treated as "<."
	// Any other values seem to make the function return null.
	switch (operator) {
		case '>':
		case 'gt':
			return (compare > 0);
		case '>=':
		case 'ge':
			return (compare >= 0);
		case '<=':
		case 'le':
			return (compare <= 0);
		case '==':
		case '=':
		case 'eq':
			return (compare === 0);
		case '<>':
		case '!=':
		case 'ne':
			return (compare !== 0);
		case '':
		case '<':
		case 'lt':
			return (compare < 0);
		default:
			return null;
	}
}
