// ====================
// INITIALISATION
// ====================
Hooks.once("init", () => {
  console.log("Initialisation du système Star Wars.");

  // Définition de la fiche de base pour les acteurs
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("starwars", StarWarsActorSheet, {
    types: ["character"],
    makeDefault: true
  });

  // Création d’un namespace global pour le système
  game.starwars = {
    requestRoll: requestRoll,
    rollNarrative: rollNarrative
  };
});


// ========================
// CLASSE DE FICHE PERSONNAGE
// ========================
class StarWarsActorSheet extends ActorSheet {
  /** @override */
  get template() {
    return "systems/starwars/templates/actor-sheet.html";
  }

  /** @override */
  getData() {
    const data = super.getData();
    data.characteristics = this.actor.system.characteristics || {};
    data.skills = this.actor.system.skills || {};
    return data;
  }
}

Hooks.once("createActor", (actor) => {
  // Initialise les caractéristiques et compétences s’il n’y en a pas encore
  if (!actor.system.characteristics) {
    actor.update({
      "system.characteristics": {
        force: 1,
        agilite: 1,
        perception: 1,
        intelligence: 1
      }
    });
  }

  if (!actor.system.skills) {
    actor.update({
      "system.skills": {
        pilotage: 0,
        tir: 0,
        mecanique: 0,
        discretion: 0
      }
    });
  }
});



// ====================
// 1. FONCTION DU MJ : ouvrir une fenêtre pour demander un jet
// ====================
function requestRoll() {
  const actors = game.actors.filter(a => a.hasPlayerOwner);
  const actorOptions = actors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");

  const dlg = new Dialog({
    title: "Demander un jet",
    content: `
      <form>
        <div class="form-group">
          <label>Personnage :</label>
          <select id="actor-select">${actorOptions}</select>
        </div>
        <div class="form-group">
          <label>Caractéristique :</label>
          <input type="text" id="characteristic" placeholder="ex: agilité">
        </div>
        <div class="form-group">
          <label>Compétence :</label>
          <input type="text" id="skill" placeholder="ex: pilotage">
        </div>
        <div class="form-group">
          <label>Difficulté :</label>
          <input type="number" id="difficulty" value="10">
        </div>
      </form>
    `,
    buttons: {
      roll: {
        label: "Demander le jet",
        callback: html => {
          const actorId = html.find("#actor-select").val();
          const characteristic = html.find("#characteristic").val();
          const skill = html.find("#skill").val();
          const difficulty = parseInt(html.find("#difficulty").val());
          sendRollRequest(actorId, characteristic, skill, difficulty);
        }
      },
      cancel: { label: "Annuler" }
    }
  });
  dlg.render(true);
}


// ====================
// 2. ENVOI DE LA DEMANDE AU JOUEUR
// ====================
function sendRollRequest(actorId, characteristic, skill, difficulty) {
  const payload = { actorId, characteristic, skill, difficulty };
  game.socket.emit("system.starwars", { action: "request-roll", data: payload });
  ui.notifications.info("Demande de jet envoyée au joueur !");
}


// ====================
// 3. ÉCOUTE DES SOCKETS
// ====================
Hooks.once("ready", () => {
  game.socket.on("system.starwars", packet => {
    if (packet.action === "request-roll") {
      showPlayerDialog(packet.data);
    }
  });
});


// ====================
// 4. CÔTÉ JOUEUR : affichage du dialogue
// ====================
function showPlayerDialog({ actorId, characteristic, skill, difficulty }) {
  const actor = game.actors.get(actorId);
  if (!actor) return;

  new Dialog({
    title: "Jet demandé par le MJ",
    content: `
      <p><strong>${actor.name}</strong> doit effectuer un jet :</p>
      <ul>
        <li>Caractéristique : ${characteristic}</li>
        <li>Compétence : ${skill}</li>
        <li>Difficulté : ${difficulty}</li>
      </ul>
    `,
    buttons: {
      roll: {
        label: "Lancer le dé !",
        callback: () => {
          rollNarrative(actor, characteristic, skill, difficulty);
        }
      },
      cancel: { label: "Refuser" }
    }
  }).render(true);
}


// ====================
// 5. FONCTION DE JET
// ====================
function rollNarrative(actor, characteristic, skill, difficulty = 10) {
  const caracValue = actor.system?.characteristics?.[characteristic] || 0;
  const skillValue = actor.system?.skills?.[skill] || 0;
  const formula = `${caracValue + skillValue} + 1d10`;
  const roll = new Roll(formula).roll({ async: false });

  const result = roll.total >= difficulty ? "Réussite" : "Échec";

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <strong>${actor.name}</strong> fait un jet de <em>${characteristic}</em> + <em>${skill}</em><br>
      Difficulté : ${difficulty}<br>
      Résultat : <strong>${result}</strong>
    `
  });
}
