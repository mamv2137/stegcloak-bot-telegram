const { Composer, session, Markup, Stage, Scene } = require('micro-bot');
const dotenv = require('dotenv');
dotenv.config();

const StegCloak = require('stegcloak');

const stegcloak = new StegCloak(true, false);

const ENCRIPT = 'encrypt';
const DECRIPT = 'decrypt';

const cancelButton = `👋 Cancel`;
const cancelMessage = `You can cancel proccess typing /cancel any time`;
const enterSecret = 'Enter the text to hide';
const introCoverScene = `Please enter the cover message`;
const introPasswordScene = `Please enter the password to hide the message`;

const exitKeyboard = Markup.keyboard([cancelButton]).oneTime();

const encryptScene = new Scene('encryptScene');
encryptScene.enter((ctx) => ctx.reply(enterSecret, exitKeyboard));
encryptScene.hears(cancelButton, (ctx) => {
  ctx.reply('Bye! encryptScene');
  ctx.scene.leave();
});
encryptScene.on('text', (ctx) => {
  const text = ctx.message.text;
  if (text !== cancelButton) {
    ctx.reply(cancelMessage);
    ctx.scene.enter('coverScene', { secret: text, mode: ENCRIPT });
  }
});

const decryptScene = new Scene('decryptScene');
decryptScene.enter((ctx) => ctx.reply(introCoverScene, exitKeyboard));
decryptScene.hears(cancelButton, (ctx) => {
  ctx.reply('Bye! decryptScene');
  ctx.scene.leave();
});
decryptScene.on('text', (ctx) => {
  const text = ctx.message.text;
  if (text !== cancelButton) {
    ctx.reply(cancelMessage);
    ctx.scene.enter('passwordScene', { cover: text, mode: DECRIPT });
  }
});

const coverScene = new Scene('coverScene');
coverScene.enter((ctx) => ctx.reply(introCoverScene, exitKeyboard));
coverScene.hears(cancelButton, (ctx) => {
  ctx.reply('Bye! coverScene');
  ctx.scene.leave();
});
coverScene.on('text', (ctx) => {
  let text = ctx.message.text;
  if (text !== cancelButton) {
    if (text.length > 1) {
      ctx.scene.enter('passwordScene', {
        cover: text,
        mode: ctx.scene.state.mode,
        secret: ctx.scene.state.secret,
      });
    } else {
      ctx.reply('at least 2 words minimum...');
    }
  }
});

const passwordScene = new Scene('passwordScene');
passwordScene.enter((ctx) => ctx.reply(introPasswordScene, exitKeyboard));
passwordScene.hears(cancelButton, (ctx) => {
  ctx.reply('Bye! passwordScene');
  ctx.scene.leave();
});
passwordScene.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text !== cancelButton) {
    const password = ctx.message.text;
    const mode = ctx.scene.state.mode;
    let message = '';

    try {
      if (mode === ENCRIPT) {
        message = await stegcloak.hide(
          ctx.scene.state.secret,
          password,
          ctx.scene.state.cover
        );
      } else if (mode === DECRIPT) {
        message = await stegcloak.reveal(ctx.scene.state.cover, password);
      }
    } catch (err) {
      return ctx.reply('not have a hide message... try again with another');
    }

    ctx.reply(message);
    ctx.scene.leave();
  }
});

const stage = new Stage();

stage.register([encryptScene, decryptScene, coverScene, passwordScene]);

stage.command('cancel', (ctx) => {
  ctx.reply('Bye!');
  ctx.scene.leave();
});

// const bot = new Telegraf(process.env.BOT_TOKEN);
const bot = new Composer();
bot.use(session());
bot.use(stage);

bot.start((ctx) => {
  const firstName = ctx.update.message.from.first_name;
  ctx.reply(`Welcome ${firstName}`);
});

bot.help((ctx) => {
  ctx.reply('List of commands');
});

bot.hears(`🔒 ${ENCRIPT}`, (ctx) => {
  ctx.scene.enter('encryptScene');
});

bot.hears(`🔓 ${DECRIPT}`, (ctx) => {
  ctx.scene.enter('decryptScene');
});

bot.command('options', (ctx) => {
  return ctx.reply(
    'Select an options',
    Markup.keyboard([`🔒 ${ENCRIPT}`, `🔓 ${DECRIPT}`]).oneTime()
  );
});

// bot.launch();

module.export = bot;
