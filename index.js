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
