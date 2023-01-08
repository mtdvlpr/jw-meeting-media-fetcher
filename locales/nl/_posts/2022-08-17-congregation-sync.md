---
tag: Configuratie
title: Gemeente sync
ref: congregation-sync
---

The brother designated as *videoconference organizer* (VO) by the body of elders can use M³ to manage what media is made available to the technical A/V support team in his congregation.

De VO, of iemand anders die door hem is aangesteld, kan:

- **extra** media uploaden om te delen tijdens een vergadering, zoals wanneer de kringopziener komt of voor een openbare lezing
- Media van JW.org **verbergen** dat niet relevant is voor de gekozen vergadering, bijvoorbeeld, wanneer een aandeel wordt vervangen door een plaatselijke behoefte
- **Terugkerende** media verwijderen of toeviegen, zoals een jaartekst filmpje of een mededelingen slideshow

All who are synced to the same congregation will then receive the exact samemedia when they click the *Update media folders* button.

Bedenk dat de gemeente sync optie geheel optioneel is.

### Hoe het werkt

M³'s onderliggende sync mechanisme gebruikt WebDAV. Dat bekent dat de VO (of iemand onder zijn leiding) een van de volgende opties moet kiezen:

- Een veilige WebDAV server opzetten die bereikbaar is via het internet, **of**
- use a third-party cloud storage service that supports the WebDAV protocol (see the Hostname setting in the *Congregation sync setup* section below).

Alle gebruikers die gesynchroniseerd willen worden moeten verbinden met dezelfde WebDAV server door gebruik te maken van de informatie en inloggegevens die de VO heeft opgegeven.

### Gemeente sync setup

| Instelling                   | Uitleg                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Hostnaam`                   | Het webadres van de WebDAV server. Veilige HTTP (HTTPS) is verplicht. <br><br> ***Note:** The label for this field is actually a button that, once clicked, will show a list of WebDAV providers that have been known to be compatible with M³, and will automatically prefill certain settings for those providers. <br><br> De lijst is bedoeld om te helpen, maar is op geen enkele manier een promotie van een bepaalde service of aanbieder. De beste server is altijd degene die je zelf beheert...* |
| `Gebruikersnaam`             | Gebruikersnaam voor de WebDAV service.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `Wachtwoord`                 | Wachtwoord voor de WebDAV service. <br><br> ***Note:** As detailed in their respective support pages, an app-specific password might need to be created for [Box](https://support.box.com/hc/en-us/articles/360043696414-WebDAV-with-Box) and [Koofr](https://koofr.eu/help/koofr_with_webdav/how-do-i-connect-a-service-to-koofr-through-webdav/) in order to enable WebDAV connections to their services.*                                                                                                           |
| `Gemeente sync folder`       | Dit is de folder die gebruikt zal worden om alle media voor de vergaderingen te synchroniseren tussen gebruikers. Je kan het pad er in plakken/typen of navigeren via je muis naar de juiste folder. <br><br> ***Note:** Make sure that all congregation sync users input the same folder path; otherwise the sync won't work as expected.*                                                                                                                                                                            |
| `Congregation-wide settings` | Once the VO has configured the *Media setup* and *Meeting setup* sections of the [Settings]({{page.lang}}/#configuration) on his own computer, he can then use this button to enforce certain settings for all congregation sync users (for example, meeting days, media language, conversion settings, and so on). Dit betekent dat sommige instellingen geforceerd aan of uit staan voor alle gesynchroniseerde gebruikers elke keer dat zij M³ openen.                                                                          |

### Gemeente sync gebruiken om media te beheren

Zodra de gemeente sync setup compleet is, ben je klaar om te beginnen met [Media beheren]({{page.lang}}/#manage-media) voor het technische AV ondersteuning team van jouw gemeente.

### Schermafbeeldingen van de gemeente sync in actie

{% include screenshots/congregation-sync.html lang=site.data.nl %}
