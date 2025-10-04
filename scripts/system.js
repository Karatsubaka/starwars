Hooks.once("init", async function() {
  console.log("Initialisation du système de jeu.");

  game.starwars = {
    rollNarrative: function(actor, characteristic, skill) {
      let caracValue = actor.data.data.characteristics[characteristic] || 0;
      let skillValue = actor.data.data.skills[skill] || 0;
      let rollFormula = `${caracValue + skillValue} + d10`;
      new Roll(rollFormula).roll({async: true}).then(r => {
        r.toMessage({
          speaker: ChatMessage.getSpeaker({actor}),
          flavor: `Je jette ${characteristic} + ${skill}.`
        });
      });
    }
  };
});
