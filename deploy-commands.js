const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('matricule-add')
        .setDescription('Enregistrer un agent et son matricule')
        .addStringOption(o => o.setName('numero').setDescription('Numéro (ex: 01)').setRequired(true))
        .addUserOption(o => o.setName('agent').setDescription('L’agent correspondant').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('all-matricules')
        .setDescription('Voir la liste complète des agents'),

    new SlashCommandBuilder()
        .setName('dispatch')
        .setDescription('Ouvrir le menu de rédaction du dispatch'),

    new SlashCommandBuilder()
        .setName('set-panel')
        .setDescription('Créer le panel de statistiques dans ce salon'),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Début de l\'enregistrement des commandes...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Nouvelles commandes enregistrées !');
    } catch (e) { 
        console.error('Erreur lors du déploiement :', e); 
    }
new SlashCommandBuilder()
    .setName('service')
    .setDescription('Prendre ou quitter son service'),
})();
