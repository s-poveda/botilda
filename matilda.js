const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const { token } = require('./auth.json');
const { Character, revitilize } = require('./characters/');
const prefix = '-';
const itemSeparator = / & /;
const {
  noCharacterFoundMessage,
  helpMessage,
  newCharacterCreatedMessage,
  partyOfZeroMessage,
  noItemsInInventoryMessage
} = require('./messages.json');

//set by the DM
let numberOfPlayers = 0;

// fills up as players use '-roll'
let responses = [];

// who is in the current party
let players = [];

// let thing = JSON.parse(fs.readFileSync('auth.json', callback));
// console.log(thing);
//  function callback (err) {
//   console.log('noice!\n');
// }

// let as = new Character('test',123);
//
// as.addItem('bow','a bow');
// saveCharacter(as);
// loadCharacter({author:{id:2134}}, 'test');
// as.addItem('bow2','another bow');
// console.log(as);



client.login(token);
console.log('Matilda got out of bed!');

client.once('ready', () => { console.log("And she's hard at work!") });

function loadCharacter (message, name) {
  if (!name) return null;
  const filePath = `./users/${message.author.id}/${name}.json`;
  if (!fs.existsSync(filePath))  return noCharacterFoundMessage;
  console.log(fs.readFileSync(filePath));
  // console.trace(`---------------------\nloading ${name}`);
  const loadedChar = JSON.parse(fs.readFileSync(filePath), (key, val) => {
    console.log(`${key} : ${val}`);
    return val;
  });

  //puts methods back
  revitilize.call(loadedChar, loadedChar);
  return loadedChar;
}

function saveCharacter (characterObject) {
  const dirPath = `./users/${characterObject.userId}`;
  console.log(`saving ${characterObject.userId} ====== ${characterObject.name}`);
  if (fs.existsSync(dirPath)) {
    console.log(`--------------------- Previous files existed at ${dirPath} ------------------------`);
    fs.open(`${dirPath}/${characterObject.name}.json`, 'w', (err, file) => {
      if (err) throw err;
      fs.writeFileSync(file, JSON.stringify(characterObject));
      fs.close( file, err => {
        if (err) throw err;
      });
    });
  }
  else {
    console.trace('---------------------\nNew User');
    fs.mkdirSync(dirPath);
    fs.open(`${dirPath}/${characterObject.name}.json`, 'w', (err, file) => {
      if (err) throw err;
      fs.writeFileSync(file, JSON.stringify(characterObject));

      fs.close( file, err => {
        if (err) throw err;
      });
    });
  }
}

function deleteCharacter (name, ) {

}

//logs to console with a heading and dasher footer
console.createCollapsable = (subject, content) => {

  //if content is falsy
  content = content? content:'Nothing found';

  console.groupCollapsed();
    console.log(`\n--------------------Start of ${subject}-----------------------`);
    console.log(content);
    console.log(`--------------------End of ${subject}-----------------------\n`);
  console.groupEnd();
};

function getRoleId (message, roleToFind) {
  //returns name of the desired ID as a string.
  const role = message.guild.roles.cache.find(role => {
    return role.name.toLowerCase() == roleToFind.toLowerCase();
  });
  if (!role) return 'no role matches';
  return role.id;
}

client.on('message', message => {

  const discordId = message.author.id;
  if (message.content.startsWith(prefix) ) {

    //checks if character is in the party and returns the object or undefined
    let currentCharacter = players.find( char => {return char.userId == discordId});
    //takes full message string and makes array with the words
    const cmds = message.content.toLowerCase().trim().substr(1).split(' ');
    switch (cmds[0]) {

      case 'load':
          currentCharacter = loadCharacter(message, cmds[1]);
          if (!cmds[1]) return message.channel.send('Please provide a name.');
          players.push(currentCharacter);
          if (currentCharacter) return message.channel.send(`<@${discordId}> ${currentCharacter.name} has been loaded and added to the party`);
        break;

      case 'save':
        saveCharacter(players.find( player => {return player.userId == discordId}));
        message.channel.send('Your character has been saved.');
        break;

      case 'rm':

        break;

      case 'leave':
        players = players.filter( player => {return player.userId !== discordId});
        numberOfPlayers--;
        message.channel.send(`<@${discordId}> ${currentCharacter.name} has been removed from the party`)
        break;

      case 'partysize':
        if (!cmds[1] > 0 || typeof parseInt(cmds[1]) != 'number') return message.channel.send(partyOfZeroMessage);
        if (message.member.roles.cache.some(role=>role.name.toLowerCase() == ('artificer')) ||
          message.member.roles.cache.some(role=>role.name.toLowerCase() == ('the dm')) ) {
            numberOfPlayers = parseInt(cmds[1]);
            console.log(`party size: ${numberOfPlayers}`);
            message.reply(`The number of players is ${numberOfPlayers}\n <@&${getRoleId(message, 'the party')}> type "-newchar [name of your character]" to begin!`);
        }
      break;

      case 'newchar':
        if (!players.some((player) => player.userId == discordId) && message.member.roles.cache.some(role=>role.name.toLowerCase() == ('the party')) ) {
          let newPlayer = new Character(cmds[1], discordId);
          players.push(newPlayer);
          console.log(`<@${discordId}> added to the active players`);
          console.log(players);
          message.channel.send(`<@${discordId}> ${newCharacterCreatedMessage}`);
        } else {
          message.channel.send(`<@${discordId}> you have been added to the active party already.`);
        }
      break;

      case 'info':
      message.channel.send('**info is displayed in terminal**')
      try {
        cmds.shift();
        var roleToFind = cmds.reduce((roleName, word) => { roleName = `${roleName} ${word} `; return roleName.trim(); });
        console.log(`"${roleToFind}" ID: ${getRoleId(message, roleToFind)}`);
      }
      catch (err){
        console.log(`no role to find was requested.`);
      }
      console.log(`your discord ID: ${discordId}.`);
      console.createCollapsable('Active Players',players);
      console.createCollapsable('Your character', currentCharacter);
      break;

    case 'roll':
      //if DM asks for roll but no # of players is not over 0, asks for input
      //else asks the party to roll
      if (message.member.roles.cache.some(role=>role.name.toLowerCase() == ('the dm')) ) {
        if (!numberOfPlayers > 0) {
          message.channel.send(`<@&${getRoleId(message, 'the dm')}> ${partyOfZeroMessage}`)
        } else {
          responses = [];
          message.channel.send(`<@&${getRoleId(message, 'the party')}> Roll for ${cmds[1]}!`);
        }
      }
      if (message.member.roles.cache.some(role=>role.name.toLowerCase() == ('the party')) ) {
          try {
            currentCharacter.roll = cmds[1];
            responses.push(currentCharacter);
            console.createCollapsable(`Responses`, responses);
            if (responses.length >= numberOfPlayers) {
              message.channel.send(`<@&${getRoleId(message, 'the dm')}> all players have submitted their rolls!`);
              const fullMessage = players.reduce((fullMessage, player) => {
                return fullMessage +`${player.name}  --------- **${player.roll}**\n`;
              },'');
              message.channel.send(fullMessage);
              responses = [];
            }
          }
          catch (err) {
            message.channel.send(`<@${message.author.id}> You have not created a character. Please type "-newchar [name of your character]"`);
          }
      }
      break;

    case 'help':
      message.channel.send(helpMessage);
      break;

    case 'clear':
      responses = [];
      message.channel.send(`Responses have been reset!`);
    break;

    case 'send':
    //makes bot send the message
      cmds.shift();
      message.channel.send(`${cmds.reduce((a,b) => {a=`${a} ${b} `; return a.trim(); }) }`);
    break;

    case 'inventory':
    if (!currentCharacter) return message.channel.send(`<@${discordId}> ${noCharacterFoundMessage}`);
    if (currentCharacter.items.length == 0) return message.author.send('There are no items in your inventory.');

    const inventoryResponse = currentCharacter.items.reduce((fullMessage, item) => {
      return fullMessage +
      `**${item.name}**
      ${item.description}
      =============================================\n`},'');
      message.author.send(inventoryResponse);
      break;

    case 'additem':
      if (!cmds[1]) return message.channel.send(`Please give the name and description separated by "&&"`);

      if (!currentCharacter) return message.channel.send(noCharacterFoundMessage);

      //deletes '-additem' and the space following from the contents of the message
      message.content = message.content.substring(cmds[0].length + 2);

      //makes array with index 0 (name): anything before separator
      //                 index 1 (description): anything after separator
      let nameAndDesc = message.content.split(itemSeparator);


      if (currentCharacter.items.some( item => {return item.name == nameAndDesc[0]}) ) return message.author.send(`You already have an item with the same name. Please try again with a different name.`)

      nameAndDesc = nameAndDesc.map( phrase => {return phrase.trim();});
      currentCharacter.addItem(nameAndDesc[0], nameAndDesc[1]);

      console.createCollapsable(`${currentCharacter.name}`, currentCharacter);
      message.channel.send(`"${nameAndDesc[0]}" has been added to your inventory!`);
      break;

    case 'removeitem':
      if (!currentCharacter) return message.channel.send(`<@${discordId}> ${noCharacterFoundMessage}`);
      if (currentCharacter.items.length == 0) return message.author.send(`<@${discordId}> ${noItemsInInventoryMessage}`);
      if (!cmds[1]) return message.channel.send('Please provide the name of the item you want to remove.')

      //deletes '-removeitem' and lingering spaces from message content
      itemName = message.content.substring(cmds[0].length + 1).trim();

      const previousItemListLength = currentCharacter.items.length;
      currentCharacter.removeItem(itemName);

      if (previousItemListLength > currentCharacter.items.length) {
        message.channel.send(`Item removed successfully: ${itemName}`);
      } else {
        message.channel.send(`No changes were made: ${itemName} not found.\nCheck your inventory. Do you have the item? Did you misspell it?`);
      }
      // console.log(currentCharacter.Items.findIndex( item => {return item.name == itemName}) );


      // TODO: remove items. add removeItems method to character class
    }
  }
});
