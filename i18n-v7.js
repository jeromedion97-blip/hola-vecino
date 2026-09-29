// Textes ajoutés en v7 (amis et bulle de messagerie)
(() => {
const add = {
fr: { nav_friends:"Mes amis", fr_title:"Mes amis", fr_friends:"Amis", fr_received:"Demandes reçues", fr_sent:"Demandes envoyées", fr_add:"Ajouter en ami", fr_pending_sent:"Demande envoyée",
  fr_cancel:"Annuler la demande", fr_accept:"Accepter", fr_decline:"Refuser", fr_remove:"Retirer de mes amis", fr_remove_confirm:"Retirer cette personne de vos amis ?", fr_is_friend:"Vous êtes amis",
  fr_wants:"veut devenir votre ami·e.", fr_count:"ami(s)", fr_none:"Vous n'avez pas encore d'amis. Présentez-vous et envoyez des demandes aux membres qui vous ressemblent !", fr_no_requests:"Aucune demande en attente.",
  notif_friend_request:"vous a envoyé une demande d'ami", notif_friend_accept:"a accepté votre demande d'ami", wall_tab_friends:"Mes amis",
  chat_title:"Messages", chat_open:"Ouvrir les messages", chat_new:"Écrire à un ami", chat_back:"Retour", chat_empty:"Aucune conversation. Écrivez à un ami ou à un membre depuis son profil." },
en: { nav_friends:"My friends", fr_title:"My friends", fr_friends:"Friends", fr_received:"Requests received", fr_sent:"Requests sent", fr_add:"Add friend", fr_pending_sent:"Request sent",
  fr_cancel:"Cancel request", fr_accept:"Accept", fr_decline:"Decline", fr_remove:"Remove from friends", fr_remove_confirm:"Remove this person from your friends?", fr_is_friend:"You are friends",
  fr_wants:"wants to be your friend.", fr_count:"friend(s)", fr_none:"You don't have any friends yet. Introduce yourself and send requests to members like you!", fr_no_requests:"No pending requests.",
  notif_friend_request:"sent you a friend request", notif_friend_accept:"accepted your friend request", wall_tab_friends:"My friends",
  chat_title:"Messages", chat_open:"Open messages", chat_new:"Write to a friend", chat_back:"Back", chat_empty:"No conversations yet. Write to a friend or to a member from their profile." },
es: { nav_friends:"Mis amigos", fr_title:"Mis amigos", fr_friends:"Amigos", fr_received:"Solicitudes recibidas", fr_sent:"Solicitudes enviadas", fr_add:"Añadir como amigo", fr_pending_sent:"Solicitud enviada",
  fr_cancel:"Cancelar la solicitud", fr_accept:"Aceptar", fr_decline:"Rechazar", fr_remove:"Quitar de mis amigos", fr_remove_confirm:"¿Quitar a esta persona de tus amigos?", fr_is_friend:"Sois amigos",
  fr_wants:"quiere ser tu amigo/a.", fr_count:"amigo(s)", fr_none:"Aún no tienes amigos. ¡Preséntate y envía solicitudes a miembros como tú!", fr_no_requests:"No hay solicitudes pendientes.",
  notif_friend_request:"te ha enviado una solicitud de amistad", notif_friend_accept:"ha aceptado tu solicitud de amistad", wall_tab_friends:"Mis amigos",
  chat_title:"Mensajes", chat_open:"Abrir los mensajes", chat_new:"Escribir a un amigo", chat_back:"Volver", chat_empty:"Aún no hay conversaciones. Escribe a un amigo o a un miembro desde su perfil." },
de: { nav_friends:"Meine Freunde", fr_title:"Meine Freunde", fr_friends:"Freunde", fr_received:"Erhaltene Anfragen", fr_sent:"Gesendete Anfragen", fr_add:"Als Freund hinzufügen", fr_pending_sent:"Anfrage gesendet",
  fr_cancel:"Anfrage zurückziehen", fr_accept:"Annehmen", fr_decline:"Ablehnen", fr_remove:"Aus Freunden entfernen", fr_remove_confirm:"Diese Person aus deinen Freunden entfernen?", fr_is_friend:"Ihr seid befreundet",
  fr_wants:"möchte mit dir befreundet sein.", fr_count:"Freund(e)", fr_none:"Du hast noch keine Freunde. Stell dich vor und sende Anfragen an Mitglieder, die zu dir passen!", fr_no_requests:"Keine offenen Anfragen.",
  notif_friend_request:"hat dir eine Freundschaftsanfrage geschickt", notif_friend_accept:"hat deine Freundschaftsanfrage angenommen", wall_tab_friends:"Meine Freunde",
  chat_title:"Nachrichten", chat_open:"Nachrichten öffnen", chat_new:"Einem Freund schreiben", chat_back:"Zurück", chat_empty:"Noch keine Unterhaltungen. Schreib einem Freund oder einem Mitglied über sein Profil." },
nl: { nav_friends:"Mijn vrienden", fr_title:"Mijn vrienden", fr_friends:"Vrienden", fr_received:"Ontvangen verzoeken", fr_sent:"Verzonden verzoeken", fr_add:"Als vriend toevoegen", fr_pending_sent:"Verzoek verzonden",
  fr_cancel:"Verzoek annuleren", fr_accept:"Aanvaarden", fr_decline:"Weigeren", fr_remove:"Uit mijn vrienden verwijderen", fr_remove_confirm:"Deze persoon uit je vrienden verwijderen?", fr_is_friend:"Jullie zijn vrienden",
  fr_wants:"wil je vriend(in) worden.", fr_count:"vriend(en)", fr_none:"Je hebt nog geen vrienden. Stel jezelf voor en stuur verzoeken naar leden die bij je passen!", fr_no_requests:"Geen openstaande verzoeken.",
  notif_friend_request:"heeft je een vriendschapsverzoek gestuurd", notif_friend_accept:"heeft je vriendschapsverzoek aanvaard", wall_tab_friends:"Mijn vrienden",
  chat_title:"Berichten", chat_open:"Berichten openen", chat_new:"Een vriend schrijven", chat_back:"Terug", chat_empty:"Nog geen gesprekken. Schrijf een vriend of een lid via zijn profiel." }
};
for (const l in add) Object.assign(window.I18N[l], add[l]);
})();
