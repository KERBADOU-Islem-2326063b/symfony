<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260203082459 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE question DROP FOREIGN KEY `FK_B6F7494EB011A311`');
        $this->addSql('DROP INDEX UNIQ_B6F7494EB011A311 ON question');
        $this->addSql('ALTER TABLE question DROP expected_response_id');
        $this->addSql('ALTER TABLE response ADD is_correct TINYINT NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE question ADD expected_response_id INT NOT NULL');
        $this->addSql('ALTER TABLE question ADD CONSTRAINT `FK_B6F7494EB011A311` FOREIGN KEY (expected_response_id) REFERENCES response (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_B6F7494EB011A311 ON question (expected_response_id)');
        $this->addSql('ALTER TABLE response DROP is_correct');
    }
}
