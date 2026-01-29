<?php

namespace App\Command;

use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

// php bin/console app:user:promote-teacher email@example.com
#[AsCommand(
    name: 'app:user:promote-teacher',
    description: 'Promote a user to ROLE_TEACHER'
)]
class PromoteUserTeacherCommand extends Command
{
    public function __construct(
        private UserRepository $userRepository,
        private EntityManagerInterface $em
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('email', InputArgument::REQUIRED, 'User email');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $user = $this->userRepository->findOneBy([
            'email' => $input->getArgument('email')
        ]);

        if (!$user) {
            $output->writeln('User not found');
            return Command::FAILURE;
        }

        $user->setRoles(['ROLE_TEACHER']);
        $this->em->flush();

        $output->writeln('User promoted to ROLE_TEACHER');
        return Command::SUCCESS;
    }
}
