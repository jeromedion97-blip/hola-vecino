// Contenu des jeux : quiz sur l'Espagne et mot espagnol du jour
(() => {
const L = ["fr","en","es","de","nl"];
const tr = a => Object.fromEntries(L.map((l, i) => [l, a[i]]));

// a = index de la bonne réponse ; opts = même liste pour toutes les langues, ou traduite
window.HV_QUIZ = [
 { q:tr(["Quelle est la capitale de l'Andalousie ?","What is the capital of Andalusia?","¿Cuál es la capital de Andalucía?","Was ist die Hauptstadt Andalusiens?","Wat is de hoofdstad van Andalusië?"]),
   opts:["Sevilla","Málaga","Granada","Córdoba"], a:0,
   why:tr(["Séville est la capitale de l'Andalousie et sa plus grande ville.","Seville is the capital and largest city of Andalusia.","Sevilla es la capital y la ciudad más grande de Andalucía.","Sevilla ist Hauptstadt und größte Stadt Andalusiens.","Sevilla is de hoofdstad en de grootste stad van Andalusië."]) },
 { q:tr(["Quel numéro appeler en cas d'urgence en Espagne ?","Which number do you call in an emergency in Spain?","¿A qué número se llama en caso de emergencia en España?","Welche Nummer wählt man in Spanien im Notfall?","Welk nummer bel je in Spanje bij een noodgeval?"]),
   opts:["112","911","999","17"], a:0,
   why:tr(["Le 112 est gratuit, disponible 24 h/24, avec des opérateurs qui parlent plusieurs langues.","112 is free, available 24/7, with operators who speak several languages.","El 112 es gratuito, funciona 24 horas y tiene operadores en varios idiomas.","Die 112 ist kostenlos, rund um die Uhr erreichbar und mehrsprachig.","112 is gratis, 24/7 bereikbaar en meertalig."]) },
 { q:tr(["Combien l'Espagne compte-t-elle de communautés autonomes ?","How many autonomous communities does Spain have?","¿Cuántas comunidades autónomas tiene España?","Wie viele autonome Gemeinschaften hat Spanien?","Hoeveel autonome gemeenschappen telt Spanje?"]),
   opts:["17","12","21","9"], a:0,
   why:tr(["17 communautés autonomes, plus les villes autonomes de Ceuta et Melilla.","17 autonomous communities, plus the autonomous cities of Ceuta and Melilla.","17 comunidades autónomas, más las ciudades autónomas de Ceuta y Melilla.","17 autonome Gemeinschaften, dazu die autonomen Städte Ceuta und Melilla.","17 autonome gemeenschappen, plus de autonome steden Ceuta en Melilla."]) },
 { q:tr(["Dans quelle ville a lieu la célèbre bataille de tomates, la Tomatina ?","In which town does the famous tomato fight, La Tomatina, take place?","¿En qué pueblo se celebra la famosa Tomatina?","In welchem Ort findet die berühmte Tomatenschlacht La Tomatina statt?","In welk dorp vindt het beroemde tomatengevecht La Tomatina plaats?"]),
   opts:["Buñol","Pamplona","Toledo","Cádiz"], a:0,
   why:tr(["Buñol, près de Valence, chaque dernier mercredi d'août.","Buñol, near Valencia, on the last Wednesday of August.","Buñol, cerca de Valencia, el último miércoles de agosto.","Buñol bei Valencia, am letzten Mittwoch im August.","Buñol, vlak bij Valencia, op de laatste woensdag van augustus."]) },
 { q:tr(["Quel plat est originaire de Valence ?","Which dish comes from Valencia?","¿Qué plato es originario de Valencia?","Welches Gericht stammt aus Valencia?","Welk gerecht komt uit Valencia?"]),
   opts:["Paella","Gazpacho","Fabada","Pulpo a la gallega"], a:0,
   why:tr(["La paella valencienne traditionnelle se prépare avec du poulet, du lapin et des haricots verts.","Traditional Valencian paella is made with chicken, rabbit and green beans.","La paella valenciana tradicional lleva pollo, conejo y judías verdes.","Die traditionelle Paella valenciana wird mit Huhn, Kaninchen und grünen Bohnen zubereitet.","De traditionele paella valenciana bevat kip, konijn en sperziebonen."]) },
 { q:tr(["Quand les enfants espagnols reçoivent-ils traditionnellement les cadeaux des Rois mages ?","When do Spanish children traditionally get presents from the Three Kings?","¿Cuándo reciben tradicionalmente los niños los regalos de los Reyes Magos?","Wann bekommen spanische Kinder traditionell die Geschenke der Heiligen Drei Könige?","Wanneer krijgen Spaanse kinderen traditioneel cadeaus van de Drie Koningen?"]),
   opts:tr([["Le 6 janvier","Le 25 décembre","Le 1er janvier","Le 6 décembre"],["6 January","25 December","1 January","6 December"],["El 6 de enero","El 25 de diciembre","El 1 de enero","El 6 de diciembre"],["Am 6. Januar","Am 25. Dezember","Am 1. Januar","Am 6. Dezember"],["Op 6 januari","Op 25 december","Op 1 januari","Op 6 december"]]), a:0,
   why:tr(["Le 6 janvier, jour des Rois, précédé la veille au soir par la cavalcade des Rois dans les rues.","On 6 January, Epiphany, after the Kings' parade through the streets the evening before.","El 6 de enero, tras la cabalgata de Reyes de la víspera.","Am 6. Januar, nach dem Umzug der Heiligen Drei Könige am Vorabend.","Op 6 januari, na de optocht van de Drie Koningen de avond ervoor."]) },
 { q:tr(["Que signifie « sobremesa » ?","What does “sobremesa” mean?","¿Qué es la «sobremesa»?","Was bedeutet „Sobremesa“?","Wat betekent ‘sobremesa’?"]),
   opts:tr([["Le moment passé à discuter à table après le repas","Un dessert","Une nappe","Une sieste"],["Time spent chatting at the table after a meal","A dessert","A tablecloth","A nap"],["El tiempo de charla en la mesa después de comer","Un postre","Un mantel","Una siesta"],["Die Zeit, in der man nach dem Essen am Tisch plaudert","Ein Nachtisch","Eine Tischdecke","Ein Mittagsschlaf"],["De tijd dat je na het eten aan tafel blijft praten","Een dessert","Een tafelkleed","Een dutje"]]), a:0,
   why:tr(["Une tradition très espagnole : on ne se lève pas de table tout de suite !","A very Spanish tradition: nobody rushes away from the table!","Una costumbre muy española: nadie tiene prisa por levantarse.","Eine sehr spanische Tradition: Niemand steht sofort vom Tisch auf!","Een typisch Spaanse gewoonte: niemand haast zich weg van tafel!"]) },
 { q:tr(["Dans quelle région le catalan est-il langue officielle ?","In which region is Catalan an official language?","¿En qué comunidad es oficial el catalán?","In welcher Region ist Katalanisch Amtssprache?","In welke regio is Catalaans een officiële taal?"]),
   opts:tr([["Catalogne","Andalousie","Galice","Castille-et-León"],["Catalonia","Andalusia","Galicia","Castile and León"],["Cataluña","Andalucía","Galicia","Castilla y León"],["Katalonien","Andalusien","Galicien","Kastilien und León"],["Catalonië","Andalusië","Galicië","Castilië en León"]]), a:0,
   why:tr(["Il l'est aussi aux Baléares et, sous le nom de valencien, dans la Communauté valencienne.","It is also official in the Balearic Islands and, as Valencian, in the Valencian Community.","También en Baleares y, como valenciano, en la Comunidad Valenciana.","Auch auf den Balearen und, als Valencianisch, in der Region Valencia.","Ook op de Balearen en, als Valenciaans, in de regio Valencia."]) },
 { q:tr(["Que signifie le sigle NIE ?","What does NIE stand for?","¿Qué significa NIE?","Wofür steht die Abkürzung NIE?","Waar staat de afkorting NIE voor?"]),
   opts:["Número de Identidad de Extranjero","Número de Impuesto Español","Nueva Identificación Europea","Número de Inscripción Electoral"], a:0,
   why:tr(["C'est le numéro d'identification des étrangers, demandé pour presque toutes les démarches.","It is the foreigner's identification number, needed for almost every procedure.","Es el número de identificación de los extranjeros, necesario para casi todo.","Die Identifikationsnummer für Ausländer, für fast alle Behördengänge nötig.","Het identificatienummer voor buitenlanders, nodig voor bijna alles."]) },
 { q:tr(["Quelle heure est-il aux Canaries quand il est midi à Madrid ?","What time is it in the Canary Islands when it is noon in Madrid?","¿Qué hora es en Canarias cuando son las 12 en Madrid?","Wie spät ist es auf den Kanaren, wenn es in Madrid 12 Uhr ist?","Hoe laat is het op de Canarische Eilanden als het in Madrid 12 uur is?"]),
   opts:["11:00","12:00","13:00","10:00"], a:0,
   why:tr(["Les Canaries ont une heure de moins que la péninsule, toute l'année.","The Canaries are one hour behind mainland Spain all year round.","Canarias tiene una hora menos que la península todo el año.","Auf den Kanaren ist es das ganze Jahr eine Stunde früher als auf dem Festland.","Op de Canarische Eilanden is het het hele jaar een uur vroeger dan op het vasteland."]) },
 { q:tr(["Quel est le plus haut sommet d'Espagne ?","What is the highest mountain in Spain?","¿Cuál es la montaña más alta de España?","Welcher ist der höchste Berg Spaniens?","Wat is de hoogste berg van Spanje?"]),
   opts:["Teide","Mulhacén","Aneto","Veleta"], a:0,
   why:tr(["Le Teide, sur l'île de Tenerife, culmine à environ 3 715 mètres.","Mount Teide, on Tenerife, rises to about 3,715 metres.","El Teide, en Tenerife, alcanza unos 3.715 metros.","Der Teide auf Teneriffa ist rund 3.715 Meter hoch.","De Teide op Tenerife is ongeveer 3.715 meter hoog."]) },
 { q:tr(["Que veut dire « ¿Qué tal? » ?","What does “¿Qué tal?” mean?","¿Qué quiere decir «¿Qué tal?»?","Was bedeutet „¿Qué tal?“?","Wat betekent ‘¿Qué tal?’?"]),
   opts:tr([["Comment ça va ?","Quelle heure est-il ?","Combien ça coûte ?","Où est-ce ?"],["How are you?","What time is it?","How much is it?","Where is it?"],["¿Cómo estás?","¿Qué hora es?","¿Cuánto cuesta?","¿Dónde está?"],["Wie geht's?","Wie spät ist es?","Was kostet das?","Wo ist das?"],["Hoe gaat het?","Hoe laat is het?","Hoeveel kost het?","Waar is het?"]]), a:0,
   why:tr(["La salutation la plus courante entre voisins !","The most common greeting between neighbours!","¡El saludo más habitual entre vecinos!","Der häufigste Gruß unter Nachbarn!","De meest gebruikte begroeting tussen buren!"]) }
];

// Mot espagnol du jour : [mot, fr, en, de, nl, exemple en espagnol]
window.HV_WORDS = [
 ["vecino, vecina","voisin, voisine","neighbour","Nachbar, Nachbarin","buurman, buurvrouw","Mi vecina me ayudó con la mudanza."],
 ["piso","appartement","flat, apartment","Wohnung","appartement","Buscamos un piso cerca de la playa."],
 ["alquiler","loyer, location","rent","Miete","huur","El alquiler incluye el agua."],
 ["cita previa","rendez-vous (administration)","appointment","Termin","afspraak","Tengo cita previa para el NIE el lunes."],
 ["sobremesa","discussion à table après le repas","after-meal chat at the table","Plauderei nach dem Essen","napraten aan tafel","La sobremesa duró dos horas."],
 ["madrugada","petit matin, après minuit","early hours of the morning","frühe Morgenstunden","vroege ochtend","Llegamos a casa de madrugada."],
 ["quedar","se donner rendez-vous","to meet up","sich verabreden","afspreken","¿Quedamos para un café?"],
 ["vale","d'accord","OK","okay","oké","Vale, nos vemos a las ocho."],
 ["chiringuito","buvette de plage","beach bar","Strandbar","strandtentje","Comimos en un chiringuito."],
 ["tapeo","sortie tapas","going out for tapas","Tapas-Tour","tapas eten","Esta noche vamos de tapeo."],
 ["puente","pont (week-end prolongé)","long weekend","verlängertes Wochenende","lang weekend","Aprovechamos el puente para viajar."],
 ["ayuntamiento","mairie","town hall","Rathaus","gemeentehuis","El padrón se hace en el ayuntamiento."],
 ["factura","facture","bill, invoice","Rechnung","factuur","La factura de la luz llega cada mes."],
 ["fianza","caution","deposit","Kaution","waarborg","La fianza es de un mes."],
 ["buzón","boîte aux lettres","letterbox","Briefkasten","brievenbus","Revisa el buzón, hay una carta."],
 ["farmacia de guardia","pharmacie de garde","on-duty pharmacy","Notdienst-Apotheke","wachtapotheek","Busca la farmacia de guardia."],
 ["mercadillo","marché de rue","street market","Wochenmarkt","markt","El mercadillo es los sábados."],
 ["¡Qué calor!","Qu'il fait chaud !","It's so hot!","Was für eine Hitze!","Wat is het warm!","¡Qué calor hace hoy!"],
 ["empadronarse","s'inscrire au padrón","to register at the town hall","sich anmelden","zich inschrijven bij de gemeente","Tienes que empadronarte al llegar."],
 ["guiri","touriste étranger (familier)","foreign tourist (slang)","ausländischer Tourist (umgangssprachlich)","buitenlandse toerist (spreektaal)","La playa está llena de guiris."],
 ["¿Me pone…?","Je voudrais… (au comptoir)","Could I have…?","Ich hätte gern…","Mag ik…?","¿Me pone un café con leche?"],
 ["la cuenta","l'addition","the bill (restaurant)","die Rechnung","de rekening","La cuenta, por favor."],
 ["merienda","goûter","afternoon snack","Nachmittagsimbiss","vieruurtje","Los niños toman la merienda a las seis."],
 ["bocadillo","sandwich","sandwich (baguette)","belegtes Brötchen","broodje","Un bocadillo de jamón, por favor."]
];
})();
