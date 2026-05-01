const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// --- INITIALISATION DE LA DB ---
const emptyDb = { matricules: {}, lastDispatch: "Aucun", panelMessageId: null, panelChannelId: null, service: {} };
let db = emptyDb;

if (fs.existsSync('./lspd_db.json')) {
    try {
        const data = fs.readFileSync('./lspd_db.json', 'utf8');
        db = data ? JSON.parse(data) : emptyDb;
    } catch (e) {
        console.error("Erreur lecture JSON, reset de la DB.");
        db = emptyDb;
    }
}

const save = () => fs.writeFileSync('./lspd_db.json', JSON.stringify(db, null, 2));

// --- FONCTION UPDATE ---
async function updatePanel() {
    if (!db.panelChannelId || !db.panelMessageId) return;
    try {
        const channel = await client.channels.fetch(db.panelChannelId);
        const message = await channel.messages.fetch(db.panelMessageId);
        
        let enPatrouille = [];
        let horsService = [];

        const agents = Object.entries(db.matricules || {});
        if (agents.length > 0) {
            agents.sort((a, b) => a[0].localeCompare(b[0])).forEach(([num, data]) => {
                const status = db.service[data.owner] === "ON" ? "🟢" : "🔴";
                const line = `${status} **[${num}]** - <@${data.owner}>`;
                if (db.service[data.owner] === "ON") enPatrouille.push(line);
                else horsService.push(line);
            });
        }

        const panelEmbed = new EmbedBuilder()
            .setTitle("📊 TABLEAU DE BORD LSPD")
            .setColor(0x0055FF)
            .addFields(
                { name: "🚔 UNITÉS EN PATROUILLE", value: enPatrouille.join('\n') || "Aucune unité", inline: false },
                { name: "💤 HORS SERVICE", value: horsService.join('\n') || "Aucun agent", inline: false },
                { name: "📢 DERNIER DISPATCH", value: (db.lastDispatch || "Aucun").substring(0, 500) }
            )
            .setTimestamp();

        await message.edit({ embeds: [panelEmbed] });
    } catch (e) { console.log("Erreur MAJ Panel (Normal si pas encore de panel créé)"); }
}

client.once('ready', () => { console.log(`Connecté : ${client.user.tag}`); });

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.commandName === 'set-panel') {
            const embed = new EmbedBuilder().setTitle("Initialisation...").setColor(0x0055FF);
            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            db.panelChannelId = interaction.channelId;
            db.panelMessageId = msg.id;
            save();
            await updatePanel();
        }

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
            await updatePanel();
        }

        if (interaction.commandName === 'matricule-add') {
            const num = interaction.options.getString('numero');
            const agent = interaction.options.getUser('agent');
            db.matricules[num] = { owner: agent.id };
            db.service[agent.id] = db.service[agent.id] || "OFF";
            save();
            await interaction.reply({ content: `✅ Matricule **${num}** ajouté.`, ephemeral: true });
            await updatePanel();
        }

        if (interaction.commandName === 'all-matricules') {
            const agents = Object.entries(db.matricules || {});
            if (agents.length === 0) return interaction.reply({ content: "Aucun agent enregistré.", ephemeral: true });
            
            let desc = agents.sort((a, b) => a[0].localeCompare(b[0])).map(([n, d]) => `**[${n}]** : <@${d.owner}>`).join('\n');
            const embed = new EmbedBuilder().setTitle("📋 Registre").setDescription(desc).setColor(0x0055FF);
            await interaction.reply({ embeds: [embed] });
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
            await updatePanel();
        }
    } catch (err) {
        console.error(err);
        if (!interaction.replied) await interaction.reply({ content: "Erreur lors de l'exécution.", ephemeral: true });
    }
});

client.login(process.env.TOKEN);
