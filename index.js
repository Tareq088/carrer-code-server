require('dotenv').config()
const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

            // middleWare
// app.use(cors({
//   origin:['http://localhost:5173'], // array karon: local host, web server, production URL theke onek somoy data nite hoy
//   credentials:true // allow credentials
// }));
app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true // jate tumi cookies niye handle koro
}))
app.use(express.json());
app.use(cookieParser());
        //firebase>>settings symbol(gear)>> project settings>>service accounts >> firebase admin sdk
var admin = require("firebase-admin");
var serviceAccount = require('./firebase-admin-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
      //middleware check kori
const  logger = (req, res, next) =>{
  console.log("inside the logger middleware");
  next();
}
                   //verify token
const verifyToken = (req,res,next) =>{
  //kare verify korbo, cookies re, taile cookies re age ante/paite hbe
  const token = req?.cookies?.token;
  console.log("cookie in the middleware: ",token);
            // token na thakle bari jao
  if(!token){
    return res.status(401).send({message: "Unauthorized"});
  }
  jwt.verify(token, process.env.JWT_ACCESS_SECRET,(error, decoded)=>{
    if(error){
      return res.status(401).send({message:"unauthorized access"});
    }
    console.log("decode here:", decoded);
            // req er moddhe dichi karon ei middle ware ke jekhane user kortechi sekahne req te pabo
    req.decoded = decoded;
     next()
  })
}
                    // verify Firbase token
const verifyFirebaseToken = async(req,res,next) =>{
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  console.log("firebase token", token);
  if(!token){
    return res.status(401).send({message: "unauthorized"});
  }
  const userInfo = await admin.auth().verifyIdToken(token);
  console.log("inside the token", userInfo);
      //req er moddhe dichi karon ei middle ware ke jekhane use kortechi sekhane req te pabo
  req.tokenEmail - userInfo.email;
  next();
}

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    const jobsCollection = client.db('CareerCode').collection("Jobs");
    const applicantsCollection = client.db("CareerCode").collection("applicants");
          // module 60.2 jwt token related api
    // app.post('/jwt',async(req,res)=>{
    //   const{email} = req.body;
    //   const user = {email}
    //           // token generate korbo ekhon
    //   const token = jwt.sign(user,process.env.JWT_ACCESS_SECRET,{expiresIn:'1h'});
    //   res.send({token})
    // })
        // module 60.4: jwt token related api
    app.post("/jwt", async(req,res)=>{
      const userData = req.body;
      const token = jwt.sign(userData, process.env.JWT_ACCESS_SECRET, {expiresIn:'1d'});
              //send token to the cookies(prothome name, token value, options)
      res.cookie('token', token,{
        httpOnly: true,
        secure: false ,// ekhon productio e use korchi na tai false emni hbe. tai false diye rakhlam
      })
      res.send({success: true});
    })
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
            //particular ekta job er jonno joto application ache ta dao
    app.get("/applications/job/:job_id",async(req,res)=>{
      const job_id= req.params.job_id;
      console.log(job_id)
      const query = {jobId: job_id};
      const result = await applicantsCollection.find(query).toArray();
      res.send(result);
    })
                //job applications related apis
    app.get("/applications", logger, verifyToken, verifyFirebaseToken, async(req,res)=>{
      const email = req.query.email;
              // token verify
      console.log('inside applications api',req.cookies);
      if(email !== req.decoded.email){
        return res.status(403).send({message: "forbidden access"});
      }
            // firebase token verify here
      if(req.tokenEmail !== email){
        return res.status(403).send({message:"forbidden access"});
      }
      // console.log(req.query)
      // console.log(email);
      let query ={};
      if(email){
        query = {applicant: email};
      }
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
                      //applicants
    app.post("/applications" ,async(req,res)=>{
      const application = req.body;
      console.log(application);
      const result = await applicantsCollection.insertOne(application);
      res.send(result);
    }) 
            // patch diye update korbo data
    app.patch("/applications/:id",async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const options ={upsert: true};
      const updatedDoc ={
        $set:{
          status: req.body.status,
        }
      };
      const result = await applicantsCollection.updateOne(filter, updatedDoc, options);
      res.send(result)
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