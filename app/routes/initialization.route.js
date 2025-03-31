import express from 'express';
import initialization from '../../createDB/initialization.js';

const initRoute = app => {

  const router = express.Router();

  router.post("/",  function(req, res)  {
    initialization((err, data) => {
      if (err)
        res.status(500).send({
          message:
            err.message || "Some error occurred while initializing the DB"
        });
      else res.send(data);
    });
  });

  app.use('/initialization', router);
};

export default initRoute;