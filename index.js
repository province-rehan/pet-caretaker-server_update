const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
// middle wares
app.use(cors());
app.use(express.json());

// user settings for mongodb
const uri = "mongodb+srv://rehanpetcaretaker:Y25OozOVqcTMrNzY@cluster0.lrdf5yx.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// jwt Middle ware
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// Api
async function run() {
  try {
    // api collection name
    const usersCollection = client.db("petCaretaker").collection("users");
    const reviewsCollection = client.db("petCaretaker").collection("reviews");
    const foodAndAccessoriesCollection = client.db("petCaretaker").collection("foodAndAccessories");
    const cartCollection = client.db("petCaretaker").collection("cart");
    const paymentCollection = client.db("petCaretaker").collection("payment");
    const postPetCollection = client.db("petCaretaker").collection("petForAdaption");
    const receiverDataCollection = client.db("petCaretaker").collection("receiverDataAfterAdaption");

    // json web TOKEN GENERATION
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "10d" });
        return res.send({ accessToken: token });
      }
      return res.status(403).send({ accessToken: "no token" });
    });
    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const result = await usersCollection.findOne(query);

      if (result?.role !== "admin") {
        return res.send(403).send({ message: "forbidden access" });
      }
      next();
    };

    // verify owner
    const verifyOwner = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const result = await usersCollection.findOne(query);

      if (result?.role !== "owner") {
        return res.send(403).send({ message: "forbidden access" });
      }
      next();
    };

    // verify receiver
    const verifyReceiver = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const result = await usersCollection.findOne(query);

      if (result?.role !== "receiver") {
        return res.send(403).send({ message: "forbidden access" });
      }
      next();
    };

    // get admin / owner / receiver
    app.get("/user/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await usersCollection.findOne(query);
      res.send({
        isAdmin: result?.role === "admin",
        isOwner: result?.role === "owner",
        isReceiver: result?.role === "receiver",
      });
    });
    // admin / owner / receiver get
    app.get("/user/:role", async (req, res) => {
      const role = req.params.role;
      const query = { role: role };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // user post
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // user get by email
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });
    // get user
    app.get("/user", async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    // review post
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });
    // review get
    app.get("/reviews", async (req, res) => {
      const query = {};
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });
    // food and accessories get all
    app.get("/foodandaccessories", async (req, res) => {
      const query = {};
      const result = await foodAndAccessoriesCollection.find(query).toArray();
      res.send(result);
    });
    // food and accessories get by id
    app.get("/foodandaccessories/:id", async (req, res) => {
      const foodAndAccessoriesId = req.params.id;
      const query = { id: foodAndAccessoriesId };
      const result = await foodAndAccessoriesCollection.findOne(query);
      res.send(result);
    });
    // cart post
    app.post("/cart", async (req, res) => {
      const cart = req.body;
      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });
    // cart get by email
    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const cart = await cartCollection.find(query).toArray();
      res.send(cart);
    });
    // all cart
    app.get("/allcart", async (req, res) => {
      const query = {};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    // cart delete
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { id: id };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    // post payment
    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      const id = payment.productId;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          cardNumber: payment.cardNumber,
        },
      };
      const updatedResult = await cartCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // payemnt get
    app.get("/payment", async (req, res) => {
      const query = {};
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });
    // post for pet adapter
    app.post("/postpet", async (req, res) => {
      const postPet = req.body;
      const result = await postPetCollection.insertOne(postPet);
      res.send(result);
    });
    // get post pet for adaption
    app.get("/postforadaption", async (req, res) => {
      const query = {};
      const result = await postPetCollection.find(query).toArray();
      res.send(result);
    });
    // post receiver data after adoting
    app.post("/adoptiondata", async (req, res) => {
      const adoptionReceiverData = req.body;
      const result = await receiverDataCollection.insertOne(adoptionReceiverData);
      res.send(result);
    });
    // get adoption receiver data by email
    app.get("/adoptiondata", async (req, res) => {
      const email = req.query.email;
      const query = { petReceiverEmail: email };
      const result = await receiverDataCollection.find(query).toArray();
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// testing server
app.get("/", (req, res) => {
  res.send(`Mongodb server running on ${port}`);
});
app.listen(port, (req, res) => {
  console.log(`Mongodb server running on ${port}`);
});
