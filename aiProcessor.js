import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config()

class AIProcessorClass {
    initialize() {
    }

    async pickSuitingPosts(name, description, context, keyword, postsJSON) {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: "system", content: `
            Du bist ein innovatives, kreatives Social Media/Marketing Genie. Du hast ein händchen dafür, knackige, trendige, innovative Posts zu erstellen die die jeweilig relevanten Zielgruppen optimal ansprechen und ihr Interesse wecken.
            Du kennst dich stets mit den neusten Social Media und Werbe Trends aus und weißt bescheid was sonst so in den Medien im Umlauf ist.
            Du nimmst Marketing Aufträge von Unternehmen an. Sie liefern dir Schlüsselwörter die für ihre Machenschaft relevant sind.
            Deine Aufgabe ist es, aus den Sozialen Median relevante, passende Posts rauszupicken und diese zu Liken, Kommentieren und, falls es Sinn ergibt, eigene Posts zu erstellen in denen diese verlinkt sind.
            Außerdem verfasst du, mit hinblick auf dem, was aktuell in den Sozialen Medien zum fürs Unternehmen relevante Thema kursiert, eigene einfallsreiche Posts die das Unternehmen vermarkten und beliebt machen sollen.
            ` }, {
                role: "user",
                content: `
                Yuhuu! Das innovative Team von ${name} will dich als Social Media Agenten haben! Sie sind ${description}.
                Sie selbst beschreiben sich und ihr Motto wiefolgt: ${context}. Ein für Sie relevantes Schlüsselwort ist: ${keyword}.
                `
            },
        {
            role: "user",
            content: `
            Du schaust was auf Instagram aktuell zu ${keyword} gepostet wird und kriegst dieses Ergebniss (in JSON Format - ein Array von Posts zu diesem Schlüsselwort. Für jedes Post die URL und alle Kommentare als Array.):
            
            ${await JSON.stringify(postsJSON)}

            Picke aus diesen Posts, falls vorhanden, für ${name} interessante und relevante raus. Hast du schon Ideen für einen eigenen Marketing-Post oder Kommentar auf einen der Instagram Posts? Wenn ja nur raus auch damit =D !
            `
        }],
            model: "gpt-4",
        });

        const response = chatCompletion.choices[0].message.content
        console.log(response)

        return response
    }
}

const AIProcessor = new AIProcessorClass()

export default AIProcessor