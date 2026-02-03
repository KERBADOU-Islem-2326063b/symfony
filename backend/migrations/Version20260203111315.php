<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260203111315 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE question_attempt (id INT AUTO_INCREMENT NOT NULL, answered_correctly TINYINT NOT NULL, question_id INT DEFAULT NULL, quiz_attempt_id INT DEFAULT NULL, INDEX IDX_1630D77B1E27F6BF (question_id), INDEX IDX_1630D77BF8FE9957 (quiz_attempt_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE quiz_attempt (id INT AUTO_INCREMENT NOT NULL, end_timestamp DATETIME NOT NULL, begin_timestamp DATETIME NOT NULL, student_id INT DEFAULT NULL, quiz_id INT NOT NULL, INDEX IDX_AB6AFC6CB944F1A (student_id), INDEX IDX_AB6AFC6853CD175 (quiz_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE question_attempt ADD CONSTRAINT FK_1630D77B1E27F6BF FOREIGN KEY (question_id) REFERENCES question (id)');
        $this->addSql('ALTER TABLE question_attempt ADD CONSTRAINT FK_1630D77BF8FE9957 FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempt (id)');
        $this->addSql('ALTER TABLE quiz_attempt ADD CONSTRAINT FK_AB6AFC6CB944F1A FOREIGN KEY (student_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE quiz_attempt ADD CONSTRAINT FK_AB6AFC6853CD175 FOREIGN KEY (quiz_id) REFERENCES quiz (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE question_attempt DROP FOREIGN KEY FK_1630D77B1E27F6BF');
        $this->addSql('ALTER TABLE question_attempt DROP FOREIGN KEY FK_1630D77BF8FE9957');
        $this->addSql('ALTER TABLE quiz_attempt DROP FOREIGN KEY FK_AB6AFC6CB944F1A');
        $this->addSql('ALTER TABLE quiz_attempt DROP FOREIGN KEY FK_AB6AFC6853CD175');
        $this->addSql('DROP TABLE question_attempt');
        $this->addSql('DROP TABLE quiz_attempt');
    }
}
