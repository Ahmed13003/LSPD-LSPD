const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

let db = { matricules: {}, lastDispatch: "Aucun", panelMessageId: null, panelChannelId: null, service: {} };
if (fs.existsSync('./lspd_db.json')) {
    try { db = JSON.parse(fs.readFileSync('./lspd_db.json')); } catch (e) { console.error("Erreur lecture DB"); }
}

const save = () => fs.writeFileSync('./lspd_db.json', JSON.stringify(db, null, 2));

async function updatePanel() {
    if (!db.panelChannelId || !db.panelMessageId) return;
    try {
        const channel = await client.channels.fetch(db.panelChannelId);
        const message = await channel.messages.fetch(db.panelMessageId);
        
        let enPatrouille = [];
        let horsService = [];

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
            .setTimestamp();

        await message.edit({ embeds: [panelEmbed] });
    } catch (e) { console.log("Erreur MAJ Panel"); }
}

client.once('ready', () => {
    console.log(`Connecté : ${client.user.tag}`);
    updatePanel();
});

client.on('interactionCreate', async interaction => {
    if (interaction.commandName === 'service') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('service_on').setLabel('Prise de Service').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('service_off').setLabel('Fin de Service').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ content: "Statut de service :", components: [row], ephemeral: true });
    }

    if (interaction.isButton()) {
        db.service[interaction.user.id] = interaction.customId === 'service_on' ? "ON" : "OFF";
        save();
        await interaction.update({ content: "Statut mis à jour !", components: [] });
        updatePanel();
    }

    if (interaction.commandName === 'set-panel') {
        const embed = new EmbedBuilder().setTitle("Initialisation...").setColor(0x0055FF);
        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
        db.panelChannelId = interaction.channelId;
        db.panelMessageId = msg.id;
        save();
        updatePanel();
    }

    if (interaction.commandName === 'matricule-add') {
        const num = interaction.options.getString('numero');
        const agent = interaction.options.getUser('agent');
        db.matricules[num] = { owner: agent.id };
        db.service[agent.id] = "OFF";
        save();
        await interaction.reply({ content: `✅ Matricule **${num}** ajouté.`, ephemeral: true });
        updatePanel();
    }

    if (interaction.commandName === 'dispatch') {
        const modal = new ModalBuilder().setCustomId('dModal').setTitle('Dispatch');
        const input = new TextInputBuilder().setCustomId('dInput').setLabel("Message").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'dModal') {
        db.lastDispatch = interaction.fields.getTextInputValue('dInput');
        save();
        const embed = new EmbedBuilder().setTitle("🚨 DISPATCH").setDescription(db.lastDispatch).setColor(0xFF0000);
        await interaction.reply({ content: "@everyone", embeds: [embed] });
        updatePanel();
    }
});

client.login(process.env.TOKEN);
if (interaction.commandName === 'all-matricules') {
        // Sécurité : on vérifie si l'objet matricules existe bien
        if (!db.matricules || Object.keys(db.matricules).length === 0) {
            return await interaction.reply({ content: "❌ Aucun matricule n'est enregistré pour le moment.", ephemeral: true });
        }

        let desc = Object.entries(db.matricules)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([n, d]) => `**[${n}]** : <@${d.owner}>`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle("📋 Registre LSPD")
            .setDescription(desc)
            .setColor(0x0055FF);

        await interaction.reply({ embeds: [embed] });
    }
