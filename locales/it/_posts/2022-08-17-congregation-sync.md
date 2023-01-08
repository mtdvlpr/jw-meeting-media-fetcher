---
tag: Configurazione
title: Sincronizzazione della congregazione
ref: congregation-sync
---

The brother designated as *videoconference organizer* (VO) by the body of elders can use M³ to manage what media is made available to the technical A/V support team in his congregation.

L'OV, o qualcuno da lui designato, può:

- carica media **aggiuntivi** da condividere durante l'adunanza, come la visita del sorvegliante di circoscrizione o il discorso pubblico
- **nascondi** contenuti multimediali da JW.org che non sono rilevanti per una determinata adunanza, ad esempio, quando una parte è stata sostituita dalla filiale
- aaggiungi o rimuovi media **ricorrenti**, come un video con il testo della scrittura dell'anno o una diapositiva con annuncio

All who are synced to the same congregation will then receive the exact samemedia when they click the *Update media folders* button.

Tieni presente che la funzione di sincronizzazione della congregazione è attiva e del tutto facoltativa.

### Come funziona

Il meccanismo di sincronizzazione di M³ utilizza WebDAV. Ciò significa che l'OV (o qualcuno sotto la sua supervisione) deve:

- configurare un server WebDAV protetto accessibile dal Web, **o**
- use a third-party cloud storage service that supports the WebDAV protocol (see the Hostname setting in the *Congregation sync setup* section below).

Tutti gli utenti che desiderano essere sincronizzati insieme dovranno connettersi allo stesso server WebDAV utilizzando le informazioni di connessione e le credenziali fornite loro dal proprio OV.

### Impostazioni sincronizzazione congregazione

| Impostazioni                                       | Spiegazione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Hostname`                                         | Indirizzo Web del server WebDAV. È richiesto HTTP sicuro (HTTPS). <br><br> ***Note:** The label for this field is actually a button that, once clicked, will show a list of WebDAV providers that have been known to be compatible with M³, and will automatically prefill certain settings for those providers. <br><br> Questo elenco è fornito a titolo di cortesia e non rappresenta in alcun modo un'approvazione di un particolare servizio o fornitore. Il server migliore è sempre quello che possiedi...* |
| `Username`                                         | Nome utente per il servizio WebDAV.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `Password`                                         | Password per il servizio WebDAV. <br><br> ***Note:** As detailed in their respective support pages, an app-specific password might need to be created for [Box](https://support.box.com/hc/en-us/articles/360043696414-WebDAV-with-Box) and [Koofr](https://koofr.eu/help/koofr_with_webdav/how-do-i-connect-a-service-to-koofr-through-webdav/) in order to enable WebDAV connections to their services.*                                                                                                                     |
| `Cartella di sincronizzazione della congregazione` | Questa è la cartella che verrà utilizzata per sincronizzare i media per tutti gli utenti sincronizzati della congregazione. Puoi digitare/incollare in un percorso o utilizzare il mouse per navigare fino alla cartella di destinazione. <br><br> ***Note:** Make sure that all congregation sync users input the same folder path; otherwise the sync won't work as expected.*                                                                                                                                               |
| `Impostazioni a livello di congregazione`          | Once the VO has configured the *Media setup* and *Meeting setup* sections of the [Settings]({{page.lang}}/#configuration) on his own computer, he can then use this button to enforce certain settings for all congregation sync users (for example, meeting days, media language, conversion settings, and so on). Ciò significa che le impostazioni selezionate verranno applicate forzatamente a tutti gli utenti sincronizzati ogni volta che aprono M³.                                                                               |

### Utilizzo della sincronizzazione della congregazione per gestire i contenuti multimediali

Una volta completata la configurazione della sincronizzazione della congregazione, sei pronto per avviare [Gestione media]({{page.lang}}/#manage-media) per la squadra AV della tua congregazione.

### Screenshot della sincronizzazione della congregazione in azione

{% include screenshots/congregation-sync.html lang=site.data.it %}
