---
tag: Configuração
title: Congregation sync
ref: congregation-sync
---

The brother designated as *videoconference organizer* (VO) by the body of elders can use M³ to manage what media is made available to the technical A/V support team in his congregation.

O OV, ou alguém que foi designado por ele, pode:

- fazer upload de mídias **adicionais** para ser exibida ou compartilhada durante uma reunião, como na visita do superintendente de circuito ou para discursos públicos
- **ocultar** mídia do JW.org que não será usada numa reunião, por exemplo, quando uma parte for substítuida.
- adicionar ou remover mídia **recorrente**, como um vídeo de texto do ano ou slides

All who are synced to the same congregation will then receive the exact samemedia when they click the *Update media folders* button.

Observe que o recurso do servidor da congregação é totalmente opcional.

### Como funciona

O M³ usa o recurso de WebDAV para sincronizar arquivos com um servidor. Isso significa que o OV (ou alguém sob sua supervisão) precisa:

- configurar um servidor WebDAV seguro que seja acessível pela Web, **ou**
- use a third-party cloud storage service that supports the WebDAV protocol (see the Hostname setting in the *Congregation sync setup* section below).

Para sincronizar todos os computadores com o servidor WebDAV, todos precisam estar conectados no mesmo servidor, usando os dados de conexão por quem criou o servidor.

### Configuração do servidor da congregação

| Configuração                              | Explicação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Nome do host`                            | Endereço Web do servidor WebDAV. HTTP seguro (HTTPS) é necessário. <br><br> ***Note:** The label for this field is actually a button that, once clicked, will show a list of WebDAV providers that have been known to be compatible with M³, and will automatically prefill certain settings for those providers. <br><br> Esta lista é fornecida como ajuda e de forma alguma representa um patrocínio de qualquer serviço ou provedor em particular. O melhor servidor é sempre aquele que você tem...* |
| `Usuário`                                 | Nome de usuário para o serviço WebDAV.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `Senha`                                   | Senha para o serviço WebDAV. <br><br> ***Note:** As detailed in their respective support pages, an app-specific password might need to be created for [Box](https://support.box.com/hc/en-us/articles/360043696414-WebDAV-with-Box) and [Koofr](https://koofr.eu/help/koofr_with_webdav/how-do-i-connect-a-service-to-koofr-through-webdav/) in order to enable WebDAV connections to their services.*                                                                                                                |
| `Congregation sync folder`                | Esta é a pasta que será usada para baixar a mídia para todos os usuários do servidor da congregação. Você pode digitar/colar um caminho ou usar o mouse para navegar até a pasta de destino. <br><br> ***Note:** Make sure that all congregation sync users input the same folder path; otherwise the sync won't work as expected.*                                                                                                                                                                                   |
| `Configurações para todos da congregação` | Once the VO has configured the *Media setup* and *Meeting setup* sections of the [Settings]({{page.lang}}/#configuration) on his own computer, he can then use this button to enforce certain settings for all congregation sync users (for example, meeting days, media language, conversion settings, and so on). Isso significa que as configurações selecionadas serão bloqueadas para todos os usuários sincronizados toda vez que abrirem o M³.                                                                             |

### Usando o servidor da congregação para escolher a mídia

Quando a configuração de sincronização da congregação estiver concluída, você estará pronto para [Gerenciar Mídia]({{page.lang}}/#manage-media) para a equipe de áudio e vídeo da sua congregação.

### Screenshots of congregation sync in action

{% include screenshots/congregation-sync.html lang=site.data.pt %}
