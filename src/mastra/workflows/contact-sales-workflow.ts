// 1. Ask user their email
// 2. Ask what their inquiry is
// 3. Loop until it's relevant to sales
// 4. Process

import { createStep, createWorkflow } from "@mastra/core/workflows";
import z from "zod";

const askEmail = createStep({
  id: 'askEmail',
  description: 'Ask user their email',
  inputSchema: z.object({
    message: z.string()
  }),
  resumeSchema: z.object({
    email: z.string()
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData?.email) {
      return suspend({ 
      message: `Thanks for reaching the sales team. I'll grab your email and your question to route you to the right person.
What's your work email?`,
      })
    }

    if (!resumeData.email.includes('@')) {
      return suspend( { 
        message: `That doesn't look like a valid email. Could you enter a work email like name@company.com?`
      })
    }

    return {
      message: 'fox',
      email: resumeData.email
    }
  }
})

const askQuery = createStep({
  id: 'askQuery',
  description: 'Ask user their query',
  inputSchema: z.object({
    email: z.string(),
    message: z.string()
  }),
  resumeSchema: z.object({
    query: z.string()
  }),
  outputSchema: z.object({
    email: z.string(),
    query: z.string()
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData?.query) {
      return suspend({ 
        message: 'Great, what would you like help with regarding pricing, plans, procurement, or purchasing?'
      })
    }

    if (resumeData.query.includes('code')) {
      return suspend( { 
        message: `It looks like this is more of a technical/support question. This channel is for sales (pricing, quotes, procurement, renewals)`
      })
    }

    return {
      email: inputData.email,
      query: resumeData.query,
    }
  }
})

const confirm = createStep({
  id: 'confirm',
  description: 'Confirm the user\'s query',
  inputSchema: z.object({
    email: z.string(),
    query: z.string(),
  }),
  resumeSchema: z.object({
    confirmed: z.boolean().optional()
  }),
  outputSchema: z.object({
    email: z.string(),
    query: z.string()
  }),
  execute: async ({ inputData, resumeData, suspend, bail }) => {
    if (!resumeData) {
      return suspend({ 
        message: `Here's what I'll send to our sales team:
Email: ${inputData.email}
Query: ${inputData.query}

Is this OK to submit?`
       })
    }

    if (!resumeData.confirmed) {
      console.log('bailing')
      throw new Error(`No worries - we'll start again to make sure everything's correct. I'll clear the details collected so far. Type anything to start again!`)
      // return bail({
      //   message: `No worries - we'll start again to make sure everything's correct. I'll clear the details collected so far. What's your work email?`,
      // })
    }

    return {
      email: inputData.email,
      query: inputData.query,
    }
  }
})


const send = createStep({
  id: 'send',
  description: 'Send the user\'s query to the sales team',
  inputSchema: z.object({
    email: z.string(),
    query: z.string(),
  }),
  outputSchema: z.object({
    message: z.string()
  }),
  execute: async ({ inputData }) => {
    return {
      message: `Thanks! I've sent this to the right salesperson. You'll hear back at ${inputData.email}. If you have another query, just type below and I gotchu.`
    }
  }
})

export const contactSalesWorkflow = createWorkflow({
  id: 'contactSalesWorkflow',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({
    message: z.string(),
  }),
})
// .then(init)
.then(askEmail)
.then(askQuery)
.then(confirm)
.then(send)
.commit()