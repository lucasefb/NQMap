import dotenv from 'dotenv';
dotenv.config();

const dbTableau = {
  user: process.env.DB_USER_TABLEAU,
  password: process.env.DB_PASSWORD_TABLEAU,
  connectString: process.env.DB_CONNECT_TABLEAU
};

const dbRemedy = {
  user: process.env.DB_USER_REMEDY,
  password: process.env.DB_PASSWORD_REMEDY,
  connectString: process.env.DB_CONNECT_REMEDY
};

const dbUCALSERV = {
  user: process.env.DB_USER_UCALSERV,
  password: process.env.DB_PASSWORD_UCALSERV,
  connectString: process.env.DB_CONNECT_UCALSERV
};

const dbReportesSm3 = {
  user: process.env.DB_USER_REPORTES_SM3,
  password: process.env.DB_PASSWORD_REPORTES_SM3,
  connectString: process.env.DB_CONNECT_REPORTES_SM3
};

export { dbTableau, dbRemedy, dbUCALSERV, dbReportesSm3 };