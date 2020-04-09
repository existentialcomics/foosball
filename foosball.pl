#!/usr/bin/perl
#
use strict; use warnings;
use Mojolicious::Lite;
use Mojolicious::Plugin::Database;
use Mojolicious::Plugin::Authentication;
use UUID::Tiny ':std';
use Data::Dumper;
use JSON::XS;
use Config::Simple;
use HTML::Escape qw/escape_html/;
# via the Digest module (recommended)
use Digest;

## hash of all connections
my %globalConnections = ();

get '/' => sub {
    my $c = shift;

    $c->res->headers->content_type('text/html');
    $c->reply->file('home.html');
};

get '/host' => sub {
    my $c = shift;

    $c->res->headers->content_type('text/html');
    $c->reply->file('host.html');
};

get '/red' => sub {
    my $c = shift;

    $c->res->headers->content_type('text/html');
    $c->reply->file('red.html');
};

get '/blue' => sub {
    my $c = shift;

    $c->res->headers->content_type('text/html');
    $c->reply->file('blue.html');
};



websocket '/ws' => sub {
    my $self = shift;

    app->log->debug(sprintf 'Client connected: %s', $self->tx);
    my $connId = sprintf "%s", $self->tx;
    $globalConnections{$connId} = $self;

    $self->inactivity_timeout(300);

    $self->on(finish => sub {
        app->log->debug("connection closed for $connId");
        delete $globalConnections{$connId};
    });

    $self->on(message => sub {
        my ($self, $msg) = @_;
        eval {
            $msg = decode_json($msg);
        } or do {
            print "bad JSON: $msg\n";
            return 0;
        };

        globalBroadcast($msg);
    });
};

sub globalBroadcast {
    my $msg = shift;

    foreach my $conn (values %globalConnections) {
        $conn->send(encode_json $msg);
    }
}

app->start;
