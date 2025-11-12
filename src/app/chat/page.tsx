'use client'

import { mastraClient } from '@/lib/mastra-client'
import { useState, useRef } from "react";
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation'
import { Message, MessageContent } from '@/components/ai-elements/message'
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input'
import { Button } from '@/components/ui/button'

type MessageType = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const [runId, setRunId] = useState('')
  const [messages, setMessages] = useState<MessageType[]>([])
  const currentStep = useRef('init')

  const addMessage = (content: string, role: 'user' | 'assistant' = 'assistant') => {
    setMessages((prevMessages) => [...prevMessages, {
      id: Date.now().toString() + Math.random().toString(),
      role,
      content
    }])
  }

  const handleInput = async (message: any, event?: any) => {
    const inputValue = message?.text || ''
    if (!inputValue) return
    addMessage(inputValue, 'user')

    if (currentStep.current === 'init') {
      const workflow = mastraClient.getWorkflow('contactSalesWorkflow')
      const { runId } = await workflow.createRunAsync()
      const result = await workflow.startAsync({
        runId,
        inputData: { message: inputValue },
      }) as any
      setRunId(runId)
      console.log('result', result)
      addMessage(result.steps.askEmail.suspendPayload.message, 'assistant')
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
        addMessage(result.steps.askQuery.suspendPayload.message, 'assistant')
        currentStep.current = 'askQuery'
        return
      }
      addMessage(result.steps.askEmail.suspendPayload.message, 'assistant')
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
        addMessage(result.steps.confirm.suspendPayload.message, 'assistant')
        currentStep.current = 'confirm'
        return
      }
      addMessage(result.steps.askQuery.suspendPayload.message, 'assistant')
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
      addMessage(result.result.message, 'assistant')
      currentStep.current = 'init'
      return
    }
    if (result.status === 'failed') {
      addMessage(result.error.split('!')[0] + '!', 'assistant')
      currentStep.current = 'init'
      return
    }





    // TODO: Add confirm code here

  }

  return (
    <div className="flex h-screen flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Start a conversation
            </div>
          )}
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>{message.content}</MessageContent>
            </Message>
          ))}
        </ConversationContent>
      </Conversation>
      {currentStep.current !== 'confirm' && (
        <div className="border-t p-4">
          <PromptInput onSubmit={handleInput}>
            <PromptInputTextarea placeholder="Enter text..." />
            <PromptInputSubmit />
          </PromptInput>
        </div>
      )}
      {currentStep.current === 'confirm' && (
        <div className="border-t p-4">
          <Button onClick={handleConfirm} className="w-full">Confirm</Button>
        </div>
      )}
    </div>
  )
}