---
tag: Configuration
title: Congregation sync
ref: congregation-sync
---

The brother designated as *videoconference organizer* (VO) by the body of elders can use M³ to manage what media is made available to the technical A/V support team in his congregation.

The VO, or someone designated by him, can:

- upload **additional** media to be shared during a meeting, such as for the circuit overseer's visit, or for public speakers' talks
- **hide** media from JW.org that isn't relevant for a given meeting, for example, when a part has been replaced by the local branch
- add or remove **recurring** media, such as a year-text video, or an announcement slide

All who are synced to the same congregation will then receive the exact samemedia when they click the *Update media folders* button.

Please note that the congregation sync feature is opt-in and entirely optional.

### How it works

M³'s underlying sync mechanism uses WebDAV. This means that the VO (or someone under his supervision) needs to either:

- set up a secured WebDAV server that is web-accessible, **or**
- use a third-party cloud storage service that supports the WebDAV protocol (see the Hostname setting in the *Congregation sync setup* section below).

All users that wish to be synchronized together will need to connect to the same WebDAV server using the connection information and credentials provided to them by their VO.

### Настройка синхронизации на уровне местного собрания

Web address of the WebDAV server. Secure HTTP (HTTPS) is required. The best server is always the one you own...</em> <br><br> ***Note:** The label for this field is actually a button that, once clicked, will show a list of WebDAV providers that have been known to be compatible with M³, and will automatically prefill certain settings for those providers. <br><br> This list is provided as a courtesy, and in no way represents an endorsement of any particular service or provider.</td> </tr> 

</tbody> </table> 



### Using congregation sync to manage media

Once the congregation sync setup is complete, you're ready to start [Managing media]({{page.lang}}/#manage-media) for your congregation's technical AV support team.



### Screenshots of congregation sync in action

{% include posts/congregation-sync.md lang=site.data.ru %}
