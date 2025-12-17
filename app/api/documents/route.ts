/**
 * Documents API Route
 * CRUD operations for RAG documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { addDocument, deleteDocument, listDocuments } from '@/lib/rag/rag-service';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = req.nextUrl.searchParams;
    const docType = searchParams.get('type') || undefined;
    const includePublic = searchParams.get('includePublic') === 'true';
    
    const documents = await listDocuments(user.id, { docType, includePublic });
    
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { title, content, docType, isPublic, metadata } = body;
    
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }
    
    const documentId = await addDocument(user.id, title, content, {
      docType: docType || 'general',
      isPublic: isPublic || false,
      metadata: metadata || {}
    });
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Failed to add document' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      documentId,
      message: 'Document added successfully'
    });
  } catch (error) {
    console.error('Add document error:', error);
    return NextResponse.json(
      { error: 'Failed to add document' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = req.nextUrl.searchParams;
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    const success = await deleteDocument(user.id, documentId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
