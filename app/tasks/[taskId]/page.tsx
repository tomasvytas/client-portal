import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canUserAccessTask } from '@/lib/organization'
import ChatInterface from '@/components/ChatInterface'

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { taskId } = await params

  // Check if user can access this task
  const canAccess = await canUserAccessTask(session.user.id, taskId)
  if (!canAccess) {
    redirect('/')
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    redirect('/')
  }

  // Convert Prisma task to ChatInterface Task format
  const taskForInterface = {
    ...task,
    deadline: task.deadline ? task.deadline.toISOString() : null,
    estimatedPrice: task.estimatedPrice ? Number(task.estimatedPrice) : null,
  }

  return <ChatInterface taskId={taskId} initialTask={taskForInterface} />
}

