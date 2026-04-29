const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Base de données locale
let db = { matricules: {}, channelDispatch: null };
if (fs.existsSync('./lspd_db.json')) db = JSON.parse(fs.readFileSync('./lspd_db.json'));
const save = () => fs.writeFileSync('./lspd_db.json', JSON.stringify(db, null, 2));

// Dispatch automatique à 21h
cron.schedule('00 21 * * *', () => {
    if (db.channelDispatch) {
        const channel = client.channels.cache.get(db.channelDispatch);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle("📢 DISPATCH LSPD - 21h00")
                .setDescription("🚨 **Tout le monde au PDP !**\n\nSignalez votre présence et vos patrouilles.")
                .setColor(0x0000FF);
            channel.send({ content: "@everyone", embeds: [embed] });
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.commandName === 'matricule-add') {
        const num = interaction.options.getString('numero');
        db.matricules[num] = { owner: null };
        save();
        await interaction.reply(`✅ Matricule ${num} ajouté.`);
    }

    if (interaction.commandName === 'matricule') {
        const options = Object.keys(db.matricules)
            .filter(m => db.matricules[m].owner === null)
            .map(m => ({ label: `Matricule ${m}`, value: m }));

        if (options.length === 0) return interaction.reply("Plus de matricules libres.");
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('sel').addOptions(options.slice(0, 25))
        );
        await interaction.reply({ content: "Choisis ton matricule :", components: [row], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'sel') {
        const has = Object.values(db.matricules).find(m => m.owner === interaction.user.id);
        if (has) return interaction.reply({ content: "Tu en as déjà un !", ephemeral: true });
        db.matricules[interaction.values[0]].owner = interaction.user.id;
        save();
        await interaction.reply(`👮 Matricule **${interaction.values[0]}** pris par <@${interaction.user.id}>.`);
    }

    if (interaction.commandName === 'all-matricules') {
        let desc = Object.entries(db.matricules).map(([n, d]) => `**[${n}]** : ${d.owner ? `<@${d.owner}>` : 'Libre'}`).join('\n');
        const embed = new EmbedBuilder().setTitle("Registre LSPD").setDescription(desc || "Vide").setColor(0x0000FF);
        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'set-dispatch') {
        db.channelDispatch = interaction.channelId;
        save();
        await interaction.reply("📍 Salon de dispatch configuré.");
    }
});

client.login(process.env.TOKEN);