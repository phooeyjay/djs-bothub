import { Collection
    , EmojiResolvable
    , MessageCreateOptions
    , MessageReaction
    , TextBasedChannel
    , User
    , WebhookClient
    , codeBlock
    , inlineCode
} from 'discord.js';
import { webcrypto as wc } from 'node:crypto';
import { CronJob, CronCommand } from 'cron';
import { TZ_GMT8 } from './constants';

//#region MISCELLANEOUS FUNCTIONS
/** 
 * - An `Error` will be reduced to the first 2 lines of the stack trace. 
 * - An `Object` or `Array` will rely on the JSON.stringify method. 
 * - Otherwise, the value will be forcibly converted into a string by concatenating an empty string. 
 */
export const stringify = (a: any) => a instanceof Error ? a.stack : typeof a !== 'object' ? a + '' : JSON.stringify(a);

/** Current datetime as a string, which follows the format `dd/mm/yyyy, hh:mm:ss`  */
export const timestamp = () => new Date().toLocaleString('en-GB', { timeZone: TZ_GMT8, timeZoneName: 'shortOffset' });

/** Uint8Array randomized between 0 ~ 255. Division with 256 to ensure number between 0 (inclusive) and 1 (exclusive). */
export const random = ((sz?: number) => {
    const arr = Array.from(wc.getRandomValues(new Uint8Array(sz && Math.max(sz, 1) || 1)), n => n / 256);
    return (sz && sz > 1) && arr || arr[0];
}) as (() => number) & ((sz: number) => number & number[]);

export const throwexc = (s: string) => { throw Error(s) };
//#endregion

//#region BALLOTEER FUNCTIONS
export const Balloteer = {
    /** Create a basic poll independent of the scenario it is called in. */
    begin: async (target: TextBasedChannel, deadline: number | undefined, contents: MessageCreateOptions, ...options: { emote: EmojiResolvable, action: (r: MessageReaction, u: User) => void }[]) => {
        const m = await target.send(contents), choices = options.map(o => o.emote);

        choices.forEach(async choice => await m.react(choice));
        return m.createReactionCollector({ 
            filter: (r, u) => !u.bot && choices.includes(r.emoji.name || 'undefined'), 
            time: deadline 
        }).on('collect', (r, u) => r.emoji.name && options.find(o => o.emote === r.emoji.name)?.action(r, u));
    }
}
//#endregion

//#region LOGGER FUNCTIONS
const logger = new WebhookClient({ url: 'https://discord.com/api/webhooks/1103945700141699142/s_u94Gm8OJej36OO_NGbsMpZF0uKv_TchsDNdRnSp2imxHaaQk_cnTvl2hRRHBcUeBsV' });
export const Logger = {
    console: (...parts: any[]) => console.log(timestamp(), ...(parts.map(stringify))), // tabspace simulation

    basic: (a: any) => {
        (async () => {
            try {
                await logger.send({ content: codeBlock(`${timestamp()} \u00A0\u00A0 ${a = stringify(a)}`) });
            } catch (e) { Logger.console('[Logger.basic] error:', e, '\n--------------------\n', a); }
        })();
    },

    interact: (by: User, what: string | undefined, error?: any) => {
        (async () => {
            const hasError = error !== undefined;
            try {
                await logger.send(codeBlock(`${timestamp()} \u00A0\u00A0 ${hasError ? '[ERROR]' : ''} ${by.username} called ${what || 'UNRESOLVED_IDENT'}` 
                + hasError ? `\n--------------------\n${error = stringify(error)}` : ''));
            } catch (e) { Logger.console('[Logger.interaction] error:', e, hasError ? `\n--------------------\n${error}` : ''); }
        })();
    }
}
//#endregion

//#region SCHEDULER FUNCTIONS
const tasks = new Collection<string, CronJob>();
export const Scheduler = {
    /** Launch a periodic `task` if the `when` paramater is specified a _string_ (in which case an `ident` is required), or a run-once job if a _Date_ is provided instead. */
    launch: (when: string | Date, task: CronCommand, ident?: string) => {
        (job => {
            if (typeof when === 'string') {
                ident && (!tasks.has(ident) && tasks.set(ident, job) || Logger.basic(`Unable to re-assign an existing identity [${ident}].`)) || Logger.basic('Unable to create a recurring task without a valid identity.');
            }
            job.start();
        })(new CronJob(when, task, null, false, TZ_GMT8));
    },

    halt: (ident?: string) => tasks.filter((_, i) => ident && i === ident || true).map(v => v).forEach(task => task.stop())
}
//#endregion
