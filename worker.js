const corsHeaders = {

"Access-Control-Allow-Origin": "https://nabdclub.doumazlina6.workers.dev",

"Access-Control-Allow-Methods": "GET, POST, OPTIONS",

"Access-Control-Allow-Headers": "Content-Type"

};


function json(data, status = 200) {

return new Response(JSON.stringify(data), {

status,

headers: {

...corsHeaders,

"Content-Type": "application/json"

}

});

}


async function sendTelegram(env, method, data) {

if (!env.TELEGRAM_BOT_TOKEN) {

throw new Error("Telegram bot token is missing");

}


return fetch(

`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,

{

method: "POST",

headers: {

"Content-Type": "application/json"

},

body: JSON.stringify(data)

}

);

}


async function handleTelegram(request, env) {

const update = await request.json();

const message = update.message;


if (!message || !message.from) {

return json({ ok: true });

}


if (

String(message.from.id) !==

String(env.TELEGRAM_ADMIN_ID)

) {

return json({ ok: true });

}


const chatId = message.chat.id;

const text = (message.text || "").trim();


if (text === "/start") {

await sendTelegram(env, "sendMessage", {

chat_id: chatId,

text:

"مرحباً بك في لوحة إدارة NABD ❤️\n\n" +

"الأوامر المتاحة:\n" +

"/messages - عرض الرسائل\n" +

"/events - عرض الفعاليات"

});

}


else if (text === "/messages") {

const result = await env.DB.prepare(

"SELECT * FROM messages ORDER BY id DESC LIMIT 20"

).all();


if (!result.results.length) {

await sendTelegram(env, "sendMessage", {

chat_id: chatId,

text: "لا توجد رسائل حالياً."

});

} else {

for (const m of result.results) {

await sendTelegram(env, "sendMessage", {

chat_id: chatId,

text:

`📩 رسالة رقم ${m.id}\n` +

`الاسم: ${m.name}\n` +

`البريد: ${m.email}\n` +

`الموضوع: ${m.subject || "بدون موضوع"}\n` +

`الرسالة: ${m.message}\n` +

`الحالة: ${m.status}`

});

}

}

}


else if (text === "/events") {

const result = await env.DB.prepare(

"SELECT * FROM events ORDER BY id DESC LIMIT 20"

).all();


const output = result.results.map(e =>

`#${e.id} - ${e.title}\n${e.event_date || ""}`

).join("\n\n");


await sendTelegram(env, "sendMessage", {

chat_id: chatId,

text: output || "لا توجد فعاليات حالياً."

});

}


else {

await sendTelegram(env, "sendMessage", {

chat_id: chatId,

text: "الأمر غير معروف. أرسلي /start لرؤية الأوامر."

});

}


return json({ ok: true });

}


export default {

async fetch(request, env) {

const url = new URL(request.url);

const path = url.pathname;


if (request.method === "OPTIONS") {

return new Response(null, {

headers: corsHeaders

});

}


try {

if (

path === "/telegram-webhook" &&

request.method === "POST"

) {

return await handleTelegram(request, env);

}


if (

path === "/" &&

request.method === "GET"

) {

return json({

service: "NABD API",

status: "running"

});

}


if (

path === "/api/events" &&

request.method === "GET"

) {

const result = await env.DB.prepare(

"SELECT * FROM events ORDER BY event_date ASC"

).all();


return json(result.results);

}


if (

path === "/api/faqs" &&

request.method === "GET"

) {

const result = await env.DB.prepare(

"SELECT * FROM faqs"

).all();


return json(result.results);

}


if (

path === "/api/socials" &&

request.method === "GET"

) {

const result = await env.DB.prepare(

"SELECT * FROM socials"

).all();


return json(result.results);

}


return json({

error: "Not found"

}, 404);


} catch (error) {

return json({

error: "Server error",

details: error.message

}, 500);

}

}

}; 

