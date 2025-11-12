'use client'

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { mastraClient } from '@/lib/mastra-client'
import { useEffect, useState, useRef } from "react";

export default function Chat() {
  const [runId, setRunId] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const currentStep = useRef('init')

  const addMessage = (text: string) => {
    setMessages((prevMessages) => [...prevMessages, text])
  }

  const handleInput = async () => {
    if (!inputValue) return
    addMessage(inputValue)
    setInputValue('')

    if (currentStep.current === 'init') {
      const workflow = mastraClient.getWorkflow('contactSalesWorkflow')
      const { runId } = await workflow.createRunAsync()
      const result = await workflow.startAsync({
        runId,
        inputData: { message: inputValue },
      }) as any
      setRunId(runId)
      console.log('result', result)
      addMessage(result.steps.askEmail.suspendPayload.message)
      currentStep.current = 'askEmail'
      return
    }

    if (currentStep.current === 'askEmail') {
      const workflow = mastraClient.getWorkflow('contactSalesWorkflow')
      const result = await workflow.resumeAsync({
        runId,
        step: 'askEmail',
        resumeData: {
          email: inputValue,
        },
      })
      if (result.steps.askEmail.status === 'success') {
        addMessage(result.steps.askQuery.suspendPayload.message)
        currentStep.current = 'askQuery'
        return
      }
      addMessage(result.steps.askEmail.suspendPayload.message)
      console.log('result', result)
    }

    if (currentStep.current === 'askQuery') {
      const workflow = mastraClient.getWorkflow('contactSalesWorkflow')
      const result = await workflow.resumeAsync({
        runId,
        step: 'askQuery',
        resumeData: {
          query: inputValue,
        },
      })

      if (result.steps.askQuery.status === 'success') {
        addMessage(result.steps.confirm.suspendPayload.message)
        currentStep.current = 'confirm'
        return
      }
      addMessage(result.steps.askQuery.suspendPayload.message)
    }



    return

  }

  const handleConfirm = async () => {
    const confirmed = window.confirm('Are you sure you want to confirm?')


    const workflow = mastraClient.getWorkflow('contactSalesWorkflow')
    const result = await workflow.resumeAsync({
      runId,
      step: 'confirm',
      resumeData: {
        confirmed
      },
    }) as any
    console.log('result', result)
    if (result.steps.confirm.status === 'success') {
      addMessage(result.result.message)
      currentStep.current = 'init'
      return
    }
    if (result.status === 'failed') {
      addMessage(result.error.split('!')[0] + '!')
      currentStep.current = 'init'
      return
    }





    // TODO: Add confirm code here

  }

  return (
    <div>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
      {currentStep.current !== 'confirm' && (
        <form onSubmit={(e) => {
          e.preventDefault()
          handleInput()
        }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter text..."
          />
        </form>
      )}
      {currentStep.current === 'confirm' && (
        <button onClick={handleConfirm}>Confirm</button>
      )}
    </div>
  )
}