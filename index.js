const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Base de données
let db = { matricules: {}, lastDispatch: "Aucun", panelMessageId: null, panelChannelId: null, service: {} };
if (fs.existsSync('./lspd_db.json')) {
    try { db = JSON.parse(fs.readFileSync('./lspd_db.json')); } catch (e) { console.error("Erreur DB"); }
}
const save = () => fs.writeFileSync('./lspd_db.json', JSON.stringify(db, null, 2));

// --- MISE À JOUR DU PANEL AVEC PRÉSENCES ---
async function updatePanel() {
    if (!db.panelChannelId || !db.panelMessageId) return;
    try {
        const channel = await client.channels.fetch(db.panelChannelId);
        const message = await channel.messages.fetch(db.panelMessageId);
        
        let enPatrouille = [];
        let horsService = [];

        // On trie les agents par matricule
        const sortedMatricules = Object.entries(db.matricules).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [num, data] of sortedMatricules) {
            const status = db.service[data.owner] === "ON" ? "🟢" : "🔴";
            const line = `${status} **[${num}]** - <@${data.owner}>`;
            if (db.service[data.owner] === "ON") enPatrouille.push(line);
            else horsService.push(line);
        }

        const panelEmbed = new EmbedBuilder()
            .setTitle("📊 TABLEAU DE BORD LSPD")
            .setColor(0x0055FF)
            .addFields(
                { name: "🚔 UNITÉS EN PATROUILLE", value: enPatrouille.join('\n') || "Aucune unité", inline: false },
                { name: "💤 HORS SERVICE", value: horsService.join('\n') || "Aucun agent", inline: false },
                { name: "📢 DERNIER DISPATCH", value: db.lastDispatch.substring(0, 500) }
            )
            .setFooter({ text: "Mise à jour en direct" })
            .setTimestamp();

        await message.edit({ embeds: [panelEmbed] });
    } catch (e) { console.log("Erreur MAJ Panel"); }
}

client.on('interactionCreate', async interaction => {
    // 1. COMMANDE SERVICE (Boutons)
    if (interaction.commandName === 'service') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('service_on').setLabel('Prise de Service').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('service_off').setLabel('Fin de Service').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ content: "Veuillez choisir votre statut :", components: [row], ephemeral: true });
    }

    // GESTION DES BOUTONS
    if (interaction.isButton()) {
        const status = interaction.customId === 'service_on' ? "ON" : "OFF";
        db.service[interaction.user.id] = status;
        save();
        const text = status === "ON" ? "✅ Vous êtes maintenant **En Service** !" : "🛑 Vous avez terminé votre **Service** !";
        await interaction.update({ content: text, components: [] });
        updatePanel();
    }

    // 2. INITIALISER LE PANEL
    if (interaction.commandName === 'set-panel') {
        const embed = new EmbedBuilder().setTitle("Initialisation...").setColor(0x0055FF);
        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
        db.panelChannelId = interaction.channelId;
        db.panelMessageId = msg.id;
        save();
        updatePanel();
    }

    // 3. AJOUTER MATRICULE
    if (interaction.commandName === 'matricule-add') {
        const num = interaction.options.getString('numero');
        const agent = interaction.options.getUser('agent');
        db.matricules[num] = { owner: agent.id };
        db.service[agent.id] = "OFF"; // Par défaut hors service
        save();
        await interaction.reply({ content: `✅ Matricule **${num}** enregistré.`, ephemeral: true });
        updatePanel();
    }

    // 4. DISPATCH
    if (interaction.commandName === 'dispatch') {
        const modal = new ModalBuilder().setCustomId('dModal').setTitle('Dispatch');
        const input = new TextInputBuilder().setCustomId('dInput').setLabel("Message").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'dModal') {
        const text = interaction.fields.getTextInputValue('dInput');
        db.lastDispatch = text;
        save();
        const embed = new EmbedBuilder().setTitle("🚨 DISPATCH").setDescription(text).setColor(0xFF0000);
        await interaction.reply({ content: "@everyone", embeds: [embed] });
        updatePanel();
    }
});

client.login(process.env.TOKEN);
