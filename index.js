const { Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const fs = require('fs');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages
    ] 
});

let db = { matricules: {}, lastDispatch: "Aucun", panelMessageId: null, panelChannelId: null };
if (fs.existsSync('./lspd_db.json')) {
    try {
        db = JSON.parse(fs.readFileSync('./lspd_db.json'));
    } catch (e) {
        console.error("Erreur lecture DB.");
    }
}

const save = () => fs.writeFileSync('./lspd_db.json', JSON.stringify(db, null, 2));

async function updatePanel() {
    if (!db.panelChannelId || !db.panelMessageId) return;
    try {
        const channel = await client.channels.fetch(db.panelChannelId);
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
                { name: "📢 Dernier Dispatch", value: db.lastDispatch.substring(0, 1024) },
                { name: "👮 Liste des Matricules", value: list.substring(0, 1024) }
            )
            .setFooter({ text: "Mise à jour en temps réel" })
            .setTimestamp();

        await message.edit({ embeds: [panelEmbed] });
    } catch (e) { 
        console.log("Erreur Panel Update"); 
    }
}

client.once('ready', () => {
    console.log(`Bot LSPD en ligne : ${client.user.tag}`);
    updatePanel();
});

client.on('interactionCreate', async interaction => {
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
        updatePanel();
    }

    if (interaction.commandName === 'all-matricules') {
        let desc = Object.entries(db.matricules)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([n, d]) => `**[${n}]** : <@${d.owner}>`)
            .join('\n');
        const embed = new EmbedBuilder().setTitle("📋 Registre LSPD").setDescription(desc || "Vide").setColor(0x0055FF);
        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'dispatch') {
        const modal = new ModalBuilder().setCustomId('dModal').setTitle('Rédaction du Dispatch');
        const input = new TextInputBuilder().setCustomId('dInput').setLabel("Message").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'dModal') {
        const text = interaction.fields.getTextInputValue('dInput');
        db.lastDispatch = text;
        save();
        const embed = new EmbedBuilder().setTitle("🚨 DISPATCH OFFICIEL").setDescription(text).setColor(0xFF0000).setTimestamp();
        await interaction.reply({ content: "@everyone", embeds: [embed] });
        updatePanel();
    }
});

client.login(process.env.TOKEN);
