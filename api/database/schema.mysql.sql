CREATE TABLE IF NOT EXISTS tarefa (
  id        INT          NOT NULL AUTO_INCREMENT,
  titulo    VARCHAR(20)  NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  CONSTRAINT pk_tarefa PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
