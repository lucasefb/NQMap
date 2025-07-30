export const queries = {
  
  planesRF:`
    select U_TECNICA, LATITUD, LONGITUD, PLAN_GENERAL, PLAN_ESTADO 
    from META_DATASITIOS 
    where PLAN_ESTADO != 'Sin Plan'
  `,

  preOrigin: {
    nuevoSector: `
      select TIPO, LATITUD, LONGITUD, CELL_ID, FECHA_DE_PEDIDO, JUSTIFICACION_DE_NEGOCIO, PORTADORA 
      from ORIGIN_MAIN 
      where TIPO = 'Nuevo Sector'
    `,
    nuevoSitio: `
      select TIPO, LATITUD, LONGITUD, CELL_ID, FECHA_DE_PEDIDO, JUSTIFICACION_DE_NEGOCIO, PORTADORA 
      from ORIGIN_MAIN 
      where TIPO = 'Nuevo Sitio'`,
    nuevoAnillo: `
      SELECT TIPO, LATITUD, LONGITUD, CELL_ID, FECHA_DE_PEDIDO, JUSTIFICACION_DE_NEGOCIO, PORTADORA 
      from ORIGIN_MAIN 
      where TIPO = 'Nuevo Anillo'`,
    expansionLTE: `
      SELECT TIPO, LATITUD, LONGITUD, CELL_ID, FECHA_DE_PEDIDO, JUSTIFICACION_DE_NEGOCIO, PORTADORA 
      from ORIGIN_MAIN 
      where TIPO = 'Expansion LTE'`,
    expansionNR: `
      SELECT TIPO, LATITUD, LONGITUD, CELL_ID, FECHA_DE_PEDIDO, JUSTIFICACION_DE_NEGOCIO, PORTADORA 
     from ORIGIN_MAIN 
     where TIPO = 'Expansion NR'`,
    expansionMultiplexacion: `
     SELECT TIPO, LATITUD, LONGITUD, CELL_ID, FECHA_DE_PEDIDO, JUSTIFICACION_DE_NEGOCIO, PORTADORA 
     from ORIGIN_MAIN 
     where TIPO = 'Expansion Multiplexacion'`,
    puntoDeInteresIndoor: `
      SELECT TIPO, LATITUD, LONGITUD, CELL_ID, FECHA_DE_PEDIDO, JUSTIFICACION_DE_NEGOCIO, PORTADORA 
      from ORIGIN_MAIN 
      where TIPO = 'Punto de Interes Indoor'`,
  },

  sitios: {
    allSites: `
      select DISTINCT U_TECNICA, LATITUD, LONGITUD, TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION != 'Test'
    `,

    gsm: {
      banda850: `
      select U_TECNICA, LATITUD, LONGITUD, NOMBRE_CELDA, AZIMUTH, BANDA, TECNOLOGIA, TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='G' and BANDA= 'GSM 850' and TIPO_SOLUCION != 'Test'`,
      banda1900: `
      select U_TECNICA, LATITUD, LONGITUD, NOMBRE_CELDA, AZIMUTH, BANDA, TECNOLOGIA, TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='G' and BANDA= 'GSM 1900' and TIPO_SOLUCION != 'Test'`
    },

    umts: {
      banda850: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='U'and BANDA= 'BANDA_850' and TIPO_SOLUCION != 'Test'`,
      banda1900: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='U'and BANDA= 'BANDA_1900' and TIPO_SOLUCION != 'Test'`
    },

    lte: {
      banda700: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='L' and BANDA= '700' and TIPO_SOLUCION != 'Test'`,
      banda1900: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='L' and BANDA= '1900' and TIPO_SOLUCION != 'Test'`,
      banda2600: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='L' and BANDA= '2600' and TIPO_SOLUCION != 'Test'`,
      banda2100: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='L' and BANDA= '2100' and TIPO_SOLUCION != 'Test'`
    },

    nr: {
      banda3500: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='NR' and BANDA= '3500' and TIPO_SOLUCION != 'Test'`,
      bandaN257: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION IS NOT NULL and TECNOLOGIA ='NR' and BANDA= 'N257' and TIPO_SOLUCION != 'Test'`
    },

    bda: {
      bdas: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION='BDA' and TECNOLOGIA ='BDA' and TIPO_SOLUCION != 'Test'`,
      quatra: `
      select U_TECNICA,LATITUD,LONGITUD,NOMBRE_CELDA,AZIMUTH,BANDA,TECNOLOGIA,TIPO_SOLUCION 
      from objetos_acceso 
      where TIPO_SOLUCION='QUATRA' and TECNOLOGIA ='BDA' and TIPO_SOLUCION != 'Test'`
    }
  },

  loadLTE: `
    select CELL_NAME, BANDA, LOAD_LTE, DESBALANCEO_LTE, DL_PRB_UTILIZATION 
    from smart.tablero_checkpoint_4g_med_cell_week 
    where FECHA = (select MAX(FECHA) from smart.tablero_checkpoint_4g_med_cell_week)
  `,

  /* Reclamos */
  loadReclamosCalidad: `
    SELECT
      ID,
      ESTADO,
      RECLAMANTE,
      LATITUD,
      LONGITUD,
      FECHA_CREACION,
      FECHA_RECLAMO,
      NOMBRE_REFERENCIAL,
      TIPO_RECLAMO,
      DESCRIPCION
    FROM reclamos_calidad_registros
  `,

  loadReclamosAcciones: `
    SELECT
      ID_RECLAMO,
      FECHA_CREACION,
      INGENIERO,
      ESTADO,
      TIPO_TAREA,
      SITIO,
      BANDA,
      DESCRIPCION,
      FECHA_EJECUCION,
      FECHA_CIERRE
    FROM reclamos_calidad_acciones
  `
};