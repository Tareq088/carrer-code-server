require('dotenv').config()
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

            // middleWare
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.taikvqz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Send a ping to confirm a successful connection
    const jobsCollection = client.db('CareerCode').collection("Jobs");
    const applicantsCollection = client.db("CareerCode").collection("applicants")
               //jobs API
    app.get("/jobs",async(req,res)=>{
        const email = req.query.email;
        console.log(email)
        let query = {};
        if(email){
        // query = {hr_email: email};
        query.hr_email = email;
        } 
        const result =await jobsCollection.find(query).toArray();
        res.send(result);
    })
          // could be done but it should not use
    // app.get("/jobsByEmailAddress", async(req,res)=>{
    //   const email = req.query.email;
    //   const query = {hr_email: email};
    //   const result = await jobsCollection.find(query).toArray();
    //   res.send(result)
      
    // })
            // fetch one by id
    app.get("/jobs/:id", async(req,res)=>{
        const {id} = req.params;
        const query = {_id:new ObjectId(id)};
        const result = await jobsCollection.findOne(query);
        res.send(result)
    })
          //post jobs
    app.post("/jobs", async(req,res)=>{
      const newJob = req.body;
      console.log(newJob);
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    })
              //applicants
    app.post("/applications" ,async(req,res)=>{
      const application = req.body;
      console.log(application)
      const result = await applicantsCollection.insertOne(application);
      res.send(result);
    }) 
                  //job applications related apis
    app.get("/applications", async(req,res)=>{
      const email = req.query.email;
      console.log(req.query)
      console.log(email)
      const query = {applicant: email};
      const result = await applicantsCollection.find(query).toArray();
            //bad way to get aggregate data
      for(const application of result){
        const jobId =  application.jobId;
        const jobQuery = {_id: new ObjectId(jobId)};
        const job = await jobsCollection.findOne(jobQuery);
        application.title = job.title;
        application.company = job.company;
        application.company_logo = job.company_logo;
      }
      res.send(result);
    })

    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req,res)=>{
    res.send("career is running on server")
});
app.listen(port, ()=>{
    console.log(`career running on port: ${port}`)
})