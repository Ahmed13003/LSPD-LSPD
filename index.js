const { Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Base de données
let db = { matricules: {} };
if (fs.existsSync('./lspd_db.json')) db = JSON.parse(fs.readFileSync('./lspd_db.json'));
const save = () => fs.writeFileSync('./lspd_db.json', JSON.stringify(db, null, 2));

client.on('interactionCreate', async interaction => {
    
    // --- 1. AJOUTER UN MATRICULE DÉJÀ PRIS ---
    if (interaction.commandName === 'matricule-add') {
        const num = interaction.options.getString('numero');
        const agent = interaction.options.getUser('agent');

        db.matricules[num] = { owner: agent.id };
        save();
        await interaction.reply(`✅ Le matricule **${num}** a été attribué manuellement à <@${agent.id}>.`);
    }

    // --- 2. VOIR TOUS LES MATRICULES ---
    if (interaction.commandName === 'all-matricules') {
        let desc = Object.entries(db.matricules)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([n, d]) => `**[${n}]** : <@${d.owner}>`)
            .join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle("📋 Annuaire des Matricules LSPD")
            .setDescription(desc || "Aucun matricule enregistré.")
            .setColor(0x0000FF);
        await interaction.reply({ embeds: [embed] });
    }

    // --- 3. COMMANDE DISPATCH INTERACTIVE ---
    if (interaction.commandName === 'dispatch') {
        const modal = new ModalBuilder()
            .setCustomId('dispatchModal')
            .setTitle('Rédaction du Dispatch');

        const messageInput = new TextInputBuilder()
            .setCustomId('dispatchInput')
            .setLabel("Contenu du message de dispatch")
            .setStyle(TextInputStyle.Paragraph) // Pour pouvoir écrire beaucoup
            .setPlaceholder('Ex: Tout le monde au PDP pour le briefing de 21h...')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
        await interaction.showModal(modal);
    }

    // Gestion de l'envoi du formulaire (Modal)
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'dispatchModal') {
        const text = interaction.fields.getTextInputValue('dispatchInput');
        
        const embed = new EmbedBuilder()
            .setTitle("🚨 DISPATCH OFFICIEL LSPD")
            .setDescription(text)
            .setColor(0xFF0000)
            .setFooter({ text: `Envoyé par ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({ content: "@everyone", embeds: [embed] });
    }
});

client.login(process.env.TOKEN);

const { Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Base de données
let db = { matricules: {}, lastDispatch: "Aucun", panelMessageId: null, panelChannelId: null };
if (fs.existsSync('./lspd_db.json')) db = JSON.parse(fs.readFileSync('./lspd_db.json'));

const save = () => fs.writeFileSync('./lspd_db.json', JSON.stringify(db, null, 2));

// --- FONCTION DE MISE À JOUR DU PANEL ---
async function updatePanel() {
    if (!db.panelChannelId || !db.panelMessageId) return;

    const channel = client.channels.cache.get(db.panelChannelId);
    if (!channel) return;

    try {
        const message = await channel.messages.fetch(db.panelMessageId);
        
        const count = Object.keys(db.matricules).length;
        let list = Object.entries(db.matricules)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([n, d]) => `🔹 **[${n}]** - <@${d.owner}>`)
            .join('\n') || "Aucun agent enregistré.";

        const panelEmbed = new EmbedBuilder()
            .setTitle("📊 TABLEAU DE BORD LSPD")
            .setColor(0x0055FF)
            .addFields(
                { name: "👥 Effectifs Totaux", value: `${count} agent(s)`, inline: true },
                { name: "📢 Dernier Dispatch", value: db.lastDispatch || "Rien à signaler", inline: false },
                { name: "👮 Liste des Matricules", value: list }
            )
            .setFooter({ text: "Mise à jour automatique" })
            .setTimestamp();

        await message.edit({ embeds: [panelEmbed] });
    } catch (e) {
        console.log("Le message du panel n'existe plus ou n'est pas accessible.");
    }
}

client.on('interactionCreate', async interaction => {
    
    // --- COMMANDE POUR INITIALISER LE PANEL ---
    if (interaction.commandName === 'set-panel') {
        const embed = new EmbedBuilder().setTitle("Initialisation du Panel...").setColor(0x0055FF);
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
        save();
        await interaction.reply({ content: `✅ Matricule **${num}** attribué.`, ephemeral: true });
        updatePanel(); // On met à jour le panel !
    }

    if (interaction.commandName === 'dispatch') {
        const modal = new ModalBuilder().setCustomId('dispatchModal').setTitle('Rédaction du Dispatch');
        const input = new TextInputBuilder().setCustomId('dispatchInput').setLabel("Contenu").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'dispatchModal') {
        const text = interaction.fields.getTextInputValue('dispatchInput');
        db.lastDispatch = text; // On enregistre le texte pour le panel
        save();

        const embed = new EmbedBuilder()
            .setTitle("🚨 DISPATCH OFFICIEL LSPD")
            .setDescription(text)
            .setColor(0xFF0000)
            .setTimestamp();

        await interaction.reply({ content: "@everyone", embeds: [embed] });
        updatePanel(); // On met à jour le panel !
    }
});

client.login(process.env.TOKEN);
