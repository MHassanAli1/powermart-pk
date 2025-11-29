import 'dotenv/config'
import express from 'express'
import { prisma } from './utils/prisma.ts'

const app = express()
app.use(express.json())
const port = 3000

app.post('/api/user/:name/:email', async (req, res) => {
  try {
    const { name, email } = req.params
    const user = await prisma.user.create({
      data: { name, email }
    })
    res.status(201).json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

app.get('/api/user', async (req, res) => {
  try {
    const users = await prisma.user.findMany()
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
