const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder().setName('matricule-add').setDescription('Ajouter un matricule').addStringOption(o => o.setName('numero').setRequired(true).setDescription('Ex: 01')),
    new SlashCommandBuilder().setName('matricule').setDescription('Prendre un matricule'),
    new SlashCommandBuilder().setName('all-matricules').setDescription('Voir tout le monde'),
    new SlashCommandBuilder().setName('set-dispatch').setDescription('Salon du 21h'),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Commandes enregistrées !');
    } catch (e) { console.error(e); }
})();