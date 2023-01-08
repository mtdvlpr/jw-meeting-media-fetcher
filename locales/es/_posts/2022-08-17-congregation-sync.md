---
tag: Configuración
title: Sincronización de la congregación
ref: congregation-sync
---

The brother designated as *videoconference organizer* (VO) by the body of elders can use M³ to manage what media is made available to the technical A/V support team in his congregation.

El OV, o alguien designado por él, puede:

- subir contenidos **adicionales** para compartir durante una reunión, como la visita del superintendente de circuito o los discursos de los oradores públicos
- **ocultar** los medios de JW.org que no son relevantes para una reunión determinada, por ejemplo, cuando una parte ha sido reemplazada por la sucursal local
- agregar o eliminar contenidos **recurrentes**, como un video de texto anual o una diapositiva de anuncio

All who are synced to the same congregation will then receive the exact samemedia when they click the *Update media folders* button.

Tenga en cuenta que la función de sincronización de la congregación totalmente opcional.

### Cómo funciona

El mecanismo de sincronización subyacente de M³ utiliza WebDAV. Esto significa que el OV (o alguien bajo su supervisión) debe:

- configurar un servidor WebDAV seguro que sea accesible desde la web, o
- use a third-party cloud storage service that supports the WebDAV protocol (see the Hostname setting in the *Congregation sync setup* section below).

Todos los usuarios que deseen sincronizarse juntos deberán conectarse al mismo servidor WebDAV utilizando la información de conexión y las credenciales que les proporcionó su OV.

### Configuración de sincronización de la congregación

| Ajuste                                         | Explicación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Nombre del host`                              | Dirección web del servidor WebDAV. Se requiere HTTP seguro (HTTPS). <br><br> ***Note:** The label for this field is actually a button that, once clicked, will show a list of WebDAV providers that have been known to be compatible with M³, and will automatically prefill certain settings for those providers. <br><br> Esta lista se proporciona como cortesía y de ninguna manera representa un respaldo de ningún servicio o proveedor en particular. El mejor servidor es siempre el tuyo...* |
| `Nombre de usuario`                            | Nombre de usuario para el servicio WebDAV.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `Contraseña`                                   | Contraseña para el servicio WebDAV. <br><br> ***Note:** As detailed in their respective support pages, an app-specific password might need to be created for [Box](https://support.box.com/hc/en-us/articles/360043696414-WebDAV-with-Box) and [Koofr](https://koofr.eu/help/koofr_with_webdav/how-do-i-connect-a-service-to-koofr-through-webdav/) in order to enable WebDAV connections to their services.*                                                                                                     |
| `Carpeta de sincronización de la congregación` | Esta es la carpeta que se usará para sincronizar contenidos para todos los usuarios de sincronización de la congregación. Puede escribir/pegar una ruta o usar el ratón para navegar a la carpeta de destino. <br><br> ***Note:** Make sure that all congregation sync users input the same folder path; otherwise the sync won't work as expected.*                                                                                                                                                              |
| `Configuración de toda la congregación`        | Once the VO has configured the *Media setup* and *Meeting setup* sections of the [Settings]({{page.lang}}/#configuration) on his own computer, he can then use this button to enforce certain settings for all congregation sync users (for example, meeting days, media language, conversion settings, and so on). Esto significa que la configuración seleccionada se aplicará a la fuerza a todos los usuarios sincronizados cada vez que abran M³.                                                                        |

### Usar la sincronización de la congregación para administrar los contenidos

Una vez que se complete la configuración de sincronización de la congregación, estará listo para iniciar [gestionar medios]({{page.lang}}/#manage-media) para el equipo de soporte técnico AV de su congregación.

### Capturas de pantalla de la sincronización de la congregación en acción

{% include screenshots/congregation-sync.html lang=site.data.es %}
