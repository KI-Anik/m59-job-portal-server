require('dotenv').config()
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000

app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eko35.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // job related apis
    const jobsCollection = client.db('jobPortal').collection('jobs')
    const applicantCollection = client.db('jobPortal').collection('applicants')
    // job circular related apis
    app.get('/jobs', async (req, res) => {
      const email = req.query.email
      let query = {}
      if (email) {
        query = { hr_email: email }
      }
      const cursor = jobsCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/jobs', async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob)
      res.send(result)
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query)
      res.send(result)
    })

    // job application apis

    // get all data
    app.get('/job-applications', async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email }
      const result = await applicantCollection.find(query).toArray()

      // get aggregate data (not recommeneded way)
      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) }
        const job = await jobsCollection.findOne(query1)
        if (job) {
          application.title = job.title
          application.location = job.location
          application.company = job.company
          application.company_logo = job.company_logo
        }
      }
      res.send(result)
    })

    app.get('/job-applications/jobs/:job_id', async(req,res)=>{
      const jobId = req.params.job_id;
      const query= {job_id: jobId}
      const result = await applicantCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/job-applicatons', async (req, res) => {
      const application = req.body;
      const result = await applicantCollection.insertOne(application)

      // implement my total application count. this method is not recommended (use agregate)
      const id = application.job_id
      const query = { _id: new ObjectId(id) }
      const job = await jobsCollection.findOne(query)
      let newCount = 0
      if (job.applicationCount) {
        newCount = job.applicationCount + 1
      } else {
        newCount = 1
      }
      // update job info
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          applicationCount : newCount
        } 
      }
      const updateResult = await jobsCollection.updateOne(filter,updateDoc)

      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('job portar server running')
});

app.listen(port, () => {
  console.log(`running port on ${port}`)
})
